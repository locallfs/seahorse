"use strict";
const {
  AbstractFulfillmentProviderService,
  MedusaError,
} = require("@medusajs/framework/utils");

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

class ShippoFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "shippo";

  constructor({ logger }, options) {
    super();
    if (!options?.api_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Shippo fulfillment provider requires api_key option"
      );
    }
    this.apiKey = options.api_key;
    this.logger = logger;
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
    if (optionId !== "shippo-overnight" && context?.items) {
      const liveKeywords = ["fish", "coral", "invert", "shrimp", "crab", "snail", "anemone", "seahorse", "clown", "tang", "wrasse", "goby", "angel", "urchin", "starfish"];
      const hasLive = context.items.some((item) => {
        const title = (item.product_title || item.title || "").toLowerCase();
        return liveKeywords.some((kw) => title.includes(kw));
      });
      if (hasLive) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "Live animals require Overnight shipping for safe delivery."
        );
      }
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

    try {
      const shipment = await this.shippoRequest("/shipments/", "POST", {
        address_from: FROM_ADDRESS,
        address_to: {
          name: [shippingAddress.first_name, shippingAddress.last_name]
            .filter(Boolean)
            .join(" ") || "Customer",
          street1: shippingAddress.address_1,
          street2: shippingAddress.address_2 || "",
          city: shippingAddress.city,
          state: shippingAddress.province || "",
          zip: shippingAddress.postal_code,
          country: shippingAddress.country_code?.toUpperCase() || "US",
          phone: shippingAddress.phone || "",
        },
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

      const amount = parseFloat(selectedRate.amount);

      this.logger.info(
        `Shippo rate: ${selectedRate.servicelevel?.name} — $${amount} (${selectedRate.provider})`
      );

      return {
        calculated_amount: amount,
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
