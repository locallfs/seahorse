"use strict";
const {
  AbstractFulfillmentProviderService,
  MedusaError,
} = require("@medusajs/framework/utils");
const {
  summarizeCart,
  buildSuppliesOnlyShipment,
  decideShippingCharge,
} = require("./free-shipping");

// One shared mapping from a Medusa shipping address to a Shippo address_to.
function buildShippoAddressTo(shippingAddress) {
  return {
    name:
      [shippingAddress.first_name, shippingAddress.last_name]
        .filter(Boolean)
        .join(" ") || "Customer",
    street1: shippingAddress.address_1,
    street2: shippingAddress.address_2 || "",
    city: shippingAddress.city,
    state: shippingAddress.province || "",
    zip: shippingAddress.postal_code,
    country: shippingAddress.country_code?.toUpperCase() || "US",
    phone: shippingAddress.phone || "",
  };
}

const SHIPPO_BASE = "https://api.goshippo.com";

// Default origin address (Woody's Seahorse shop)
const FROM_ADDRESS = {
  name: "Woody's Seahorse Aquarium & Supply",
  street1: "106 NE Russet St",
  city: "Portland",
  state: "OR",
  zip: "97211",
  country: "US",
  phone: "5032834788",
  email: "info@seahorseaquariumsupply.com",
};

// Default parcel dimensions for aquarium supplies
const DEFAULT_PARCEL = {
  length: 12,
  width: 12,
  height: 10,
  distance_unit: "in",
  weight: 5,
  mass_unit: "lb",
};

// Keywords that mark an item as a live animal — triggers overnight-only
// shipping and the live-animal handling fee.
const LIVE_ANIMAL_KEYWORDS = [
  "fish", "coral", "invert", "shrimp", "crab", "snail", "anemone",
  "seahorse", "clown", "tang", "wrasse", "goby", "angel", "urchin", "starfish",
];

// Handling fees in dollars — covers boxes, insulation, heat packs, bags, labor.
const HANDLING_FEE_SUPPLIES = 7;
const HANDLING_FEE_LIVE = 12;

function hasLiveAnimals(items) {
  if (!Array.isArray(items)) return false;
  return items.some((item) => {
    const title = (item.product_title || item.title || "").toLowerCase();
    return LIVE_ANIMAL_KEYWORDS.some((kw) => title.includes(kw));
  });
}

class ShippoFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "shippo";

  constructor(container, options) {
    super();
    if (!options?.api_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Shippo fulfillment provider requires api_key option"
      );
    }
    this.apiKey = options.api_key;
    this.logger = container.logger;
    // Shared PG connection — used to classify cart items by category/tags/
    // metadata for free-shipping eligibility (titles are NEVER used for
    // eligibility). If unavailable, free shipping simply never applies.
    this.pg = container.__pg_connection__ ?? null;
  }

  // Classifies each product in the cart from stable data: explicit
  // metadata.free_shipping_eligible override, category handles, and tag
  // values. Returns a Map keyed by product_id.
  async classifyCartItems(items) {
    const productIds = [
      ...new Set(
        (items || []).map((i) => i?.product_id).filter((id) => !!id)
      ),
    ];
    if (productIds.length === 0 || !this.pg) return new Map();
    const marks = productIds.map(() => "?").join(",");
    const res = await this.pg.raw(
      `select p.id,
              p.metadata->>'free_shipping_eligible' as fse,
              coalesce(array_agg(distinct pc.handle)
                       filter (where pc.handle is not null), '{}') as handles,
              coalesce(array_agg(distinct pt.value)
                       filter (where pt.value is not null), '{}') as tags
         from product p
         left join product_category_product pcp on pcp.product_id = p.id
         left join product_category pc on pc.id = pcp.product_category_id
          and pc.deleted_at is null
         left join product_tags ptj on ptj.product_id = p.id
         left join product_tag pt on pt.id = ptj.product_tag_id
          and pt.deleted_at is null
        where p.deleted_at is null and p.id in (${marks})
        group by p.id`,
      productIds
    );
    const map = new Map();
    for (const row of res?.rows || []) {
      map.set(String(row.id), {
        metadata_override:
          row.fse === "true" ? true : row.fse === "false" ? false : null,
        category_handles: row.handles || [],
        tag_values: row.tags || [],
      });
    }
    return map;
  }

  // Genuine supplies-only carrier quote for a qualifying mixed cart: a
  // separate Shippo shipment holding ONLY the supply items, packed under the
  // supplies packaging rule, to the customer's actual destination. The
  // supplies' default service is Standard, i.e. the cheapest rate OF THIS
  // supplies-only shipment. Returns null on any failure — the caller then
  // charges the normal undiscounted price and logs a diagnostic. We never
  // guess and never reuse a rate from the mixed/livestock shipment.
  async quoteSuppliesOnlyCarrierRate(shippingAddress, items) {
    try {
      const classifications = await this.classifyCartItems(items);
      if (classifications.size === 0) return null;
      const built = buildSuppliesOnlyShipment({
        addressFrom: FROM_ADDRESS,
        addressTo: buildShippoAddressTo(shippingAddress),
        items: (items || []).map((i) => ({ product_id: i?.product_id })),
        classifications,
        suppliesParcel: DEFAULT_PARCEL,
      });
      if (!built) return null;
      const shipment = await this.shippoRequest(
        "/shipments/",
        "POST",
        built.request
      );
      const amounts = (shipment.rates || [])
        .map((r) => parseFloat(r.amount))
        .filter(Number.isFinite);
      if (amounts.length === 0) {
        this.logger.warn("Shippo: supplies-only quote returned no rates");
        return null;
      }
      return Math.min(...amounts);
    } catch (err) {
      this.logger.warn(
        `Shippo: supplies-only quote failed: ${err?.message || err}`
      );
      return null;
    }
  }

  // Live Fish/Coral subtotal vs the threshold. Any failure returns null,
  // which downstream means "charge full price" — never accidental free.
  async freeShippingSummary(items) {
    try {
      if (!this.pg) return null;
      const classifications = await this.classifyCartItems(items);
      return summarizeCart(
        (items || []).map((i) => ({
          product_id: i?.product_id,
          unit_price: Number(i?.unit_price ?? 0),
          quantity: Number(i?.quantity ?? 1),
        })),
        classifications
      );
    } catch (err) {
      this.logger.warn(
        `Shippo free-shipping classification failed (charging full price): ${err?.message || err}`
      );
      return null;
    }
  }

  async shippoRequest(endpoint, method = "GET", body = null) {
    const url = `${SHIPPO_BASE}${endpoint}`;
    const headers = {
      Authorization: `ShippoToken ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      this.logger.error(`Shippo API error (${res.status}): ${text}`);
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Shippo API error (${res.status}): ${text}`
      );
    }

    return res.json();
  }

  async getFulfillmentOptions() {
    return [
      {
        id: "shippo-standard",
        name: "Standard Shipping",
        is_return: false,
      },
      {
        id: "shippo-express",
        name: "Express Shipping (2-Day)",
        is_return: false,
      },
      {
        id: "shippo-overnight",
        name: "Overnight Shipping",
        is_return: false,
      },
    ];
  }

  async validateFulfillmentData(optionData, data, context) {
    // Enforce: live animals can only use overnight shipping
    const optionId = optionData?.id || "";
    if (optionId !== "shippo-overnight" && hasLiveAnimals(context?.items)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Live animals require Overnight shipping for safe delivery."
      );
    }
    return { ...data };
  }

  async validateOption(data) {
    return true;
  }

  async canCalculate(data) {
    return true;
  }

  async calculatePrice(optionData, data, context) {
    const shippingAddress = context?.shipping_address;

    if (!shippingAddress?.address_1 || !shippingAddress?.city || !shippingAddress?.postal_code) {
      this.logger.warn("Shippo calculatePrice: incomplete shipping address, returning 0");
      return {
        calculated_amount: 0,
        is_calculated_price_tax_inclusive: false,
      };
    }

    // Free-shipping check first: a qualifying live-only cart needs no carrier
    // rate at all. Classification failures leave summary null → full price.
    const summary = await this.freeShippingSummary(context?.items);
    if (summary?.qualifies && !summary.hasOtherItems) {
      this.logger.info(
        `Shippo: live fish/coral subtotal $${summary.liveSubtotal} meets the free-shipping threshold and the cart is live-only — shipping is free`
      );
      return {
        calculated_amount: 0,
        is_calculated_price_tax_inclusive: false,
      };
    }

    try {
      const shipment = await this.shippoRequest("/shipments/", "POST", {
        address_from: FROM_ADDRESS,
        address_to: buildShippoAddressTo(shippingAddress),
        parcels: [DEFAULT_PARCEL],
        async: false,
      });

      const rates = shipment.rates || [];
      if (rates.length === 0) {
        this.logger.warn("Shippo: no rates returned");
        return {
          calculated_amount: 0,
          is_calculated_price_tax_inclusive: false,
        };
      }

      const optionId = optionData?.id || "shippo-standard";
      let selectedRate;

      if (optionId === "shippo-overnight") {
        selectedRate = rates.find(
          (r) =>
            r.servicelevel?.token?.includes("overnight") ||
            r.servicelevel?.token?.includes("next_day") ||
            r.servicelevel?.token?.includes("express") ||
            r.servicelevel?.name?.toLowerCase().includes("overnight") ||
            r.servicelevel?.name?.toLowerCase().includes("next day")
        );
      } else if (optionId === "shippo-express") {
        selectedRate = rates.find(
          (r) =>
            r.servicelevel?.token?.includes("priority") ||
            r.servicelevel?.token?.includes("express") ||
            r.servicelevel?.name?.toLowerCase().includes("priority") ||
            r.servicelevel?.name?.toLowerCase().includes("2-day") ||
            r.servicelevel?.name?.toLowerCase().includes("2 day")
        );
      }

      if (!selectedRate) {
        // Fall back to cheapest rate for standard, or cheapest matching for others
        const sorted = [...rates].sort(
          (a, b) => parseFloat(a.amount) - parseFloat(b.amount)
        );
        selectedRate = sorted[0];
      }

      const carrierAmount = parseFloat(selectedRate.amount);

      // Qualifying mixed cart: fetch a GENUINE supplies-only quote — a second
      // Shippo shipment built from the supply items alone. Never a rate
      // borrowed from this mixed/livestock shipment's response.
      let suppliesOnlyCarrierAmount = null;
      if (summary?.qualifies && summary.hasOtherItems) {
        suppliesOnlyCarrierAmount = await this.quoteSuppliesOnlyCarrierRate(
          shippingAddress,
          context?.items
        );
      }

      const { amount: totalAmount, waived, freeLivePortion, reason } =
        decideShippingCharge({
          carrierAmount,
          suppliesOnlyCarrierAmount,
          handlingLive: HANDLING_FEE_LIVE,
          handlingSupplies: HANDLING_FEE_SUPPLIES,
          cartHasLiveAnimals: hasLiveAnimals(context?.items),
          summary,
        });

      if (reason === "supplies_quote_unavailable") {
        this.logger.error(
          "Shippo: supplies-only quote unavailable for a qualifying mixed cart — charging the normal undiscounted rate; NOT substituting a mixed/livestock rate"
        );
      }
      this.logger.info(
        `Shippo rate: ${selectedRate.servicelevel?.name} — $${carrierAmount} carrier → $${totalAmount} charged${
          freeLivePortion && summary?.hasOtherItems
            ? ` ($${waived} live-portion shipping waived; supplies pay their own quoted rate $${suppliesOnlyCarrierAmount} + $${HANDLING_FEE_SUPPLIES} handling)`
            : freeLivePortion
              ? ` ($${waived} waived — qualifying live-only cart)`
              : ""
        } (${selectedRate.provider})`
      );

      return {
        calculated_amount: totalAmount,
        is_calculated_price_tax_inclusive: false,
      };
    } catch (err) {
      this.logger.error(`Shippo calculatePrice error: ${err.message}`);
      return {
        calculated_amount: 0,
        is_calculated_price_tax_inclusive: false,
      };
    }
  }

  async createFulfillment(data, items, order, fulfillment) {
    return { data: { ...data } };
  }

  async cancelFulfillment(data) {
    return {};
  }

  async createReturnFulfillment(fromData) {
    return { data: { ...fromData } };
  }
}

module.exports = ShippoFulfillmentService;
module.exports.ShippoFulfillmentService = ShippoFulfillmentService;
