"use strict";
const {
  AbstractFulfillmentProviderService,
  MedusaError,
} = require("@medusajs/framework/utils");
const {
  LIVESTOCK_SHIPPING_RULES,
  LIVESTOCK_FULFILLMENT_OPTION,
  LIVESTOCK_FULFILLMENT_OPTION_ID,
  LIVESTOCK_RATE_CACHE_TTL_SECONDS,
  LIVESTOCK_ERRORS,
  getAutoThermalResolver,
} = require("./livestock-config");
const {
  mergeShippingMeta,
  expandLivestockItems,
  packLivestock,
  toShippoParcels,
  selectUpsNextDayAirRate,
  describeOfferedServiceLevels,
  nextSafeShipDate,
  rateFingerprint,
  buildLivestockShipmentPlan,
  sumUnits,
} = require("./livestock-packing");
const { createWeatherService } = require("./livestock-weather");

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
const HANDLING_FEE_LIVE = 8;

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
    // Shared PG connection. Medusa 2.13 does not include product or variant
    // metadata in the calculatePrice context, so the livestock path reads it
    // from here. Without a connection, livestock items cannot be classified
    // and the shipment is refused rather than silently mispriced.
    this.pg = container.__pg_connection__ ?? null;

    // Medusa's Redis cache when the module container exposes it, otherwise a
    // tiny in-process TTL map. Used for Shippo rate dedup and weather lookups
    // so a checkout that recalculates five times hits Shippo once.
    this.cache = this.#resolveCache(container);

    this.weather = createWeatherService({
      logger: this.logger,
      cache: this.cache,
    });
  }

  #resolveCache(container) {
    for (const key of ["cacheService", "cache"]) {
      try {
        // Awilix THROWS on an unregistered key rather than returning
        // undefined, and the fulfillment module's container does not carry the
        // app-level cache module. Without this guard the constructor dies and
        // takes the whole Shippo provider — dry goods included — with it.
        const candidate = container?.[key];
        if (
          candidate &&
          typeof candidate.get === "function" &&
          typeof candidate.set === "function"
        ) {
          return candidate;
        }
      } catch {
        /* not registered in this container — fall through */
      }
    }
    // Fallback: per-process map with expiry. Same async shape as Medusa's.
    const store = new Map();
    return {
      async get(key) {
        const hit = store.get(key);
        if (!hit) return null;
        if (hit.expires <= Date.now()) {
          store.delete(key);
          return null;
        }
        return hit.value;
      },
      async set(key, value, ttlSeconds) {
        store.set(key, { value, expires: Date.now() + (ttlSeconds || 60) * 1000 });
      },
    };
  }

  /**
   * Shipping metadata for every product and variant in the cart, merged with
   * variant taking precedence. Medusa does not pass metadata into
   * calculatePrice, so it is fetched directly.
   *
   * Returns a Map keyed by `${product_id}:${variant_id}`.
   */
  async fetchShippingMeta(items) {
    const out = new Map();
    if (!this.pg) return out;

    const productIds = [...new Set((items || []).map((i) => i?.product_id).filter(Boolean))];
    const variantIds = [...new Set((items || []).map((i) => i?.variant_id).filter(Boolean))];
    if (productIds.length === 0) return out;

    const pMarks = productIds.map(() => "?").join(",");
    const products = await this.pg.raw(
      `select id, metadata from product where deleted_at is null and id in (${pMarks})`,
      productIds,
    );
    const productMeta = new Map(
      (products?.rows || []).map((r) => [String(r.id), r.metadata || {}]),
    );

    const variantMeta = new Map();
    if (variantIds.length) {
      const vMarks = variantIds.map(() => "?").join(",");
      const variants = await this.pg.raw(
        `select id, metadata from product_variant where deleted_at is null and id in (${vMarks})`,
        variantIds,
      );
      for (const r of variants?.rows || []) {
        variantMeta.set(String(r.id), r.metadata || {});
      }
    }

    for (const item of items || []) {
      const key = `${item?.product_id ?? ""}:${item?.variant_id ?? ""}`;
      out.set(
        key,
        mergeShippingMeta(
          productMeta.get(String(item?.product_id)) || {},
          variantMeta.get(String(item?.variant_id)) || {},
        ),
      );
    }
    return out;
  }

  /** Cart lines reshaped for the pure packing logic, metadata attached. */
  async buildShippingLines(items) {
    const metaByKey = await this.fetchShippingMeta(items);
    return (items || []).map((item) => ({
      id: item?.id ?? null,
      product_id: item?.product_id ?? null,
      variant_id: item?.variant_id ?? null,
      quantity: Number(item?.quantity ?? 1),
      title: item?.product_title || item?.title || null,
      meta: metaByKey.get(`${item?.product_id ?? ""}:${item?.variant_id ?? ""}`) || {},
    }));
  }

  /**
   * Resolve the thermal mode for a shipment.
   *
   * Explicit wins over everything: a `temperature_control` of none/heat/cold on
   * the shipping method data or the option data is an operator decision.
   * `auto` uses the live weather service (or a registered custom resolver).
   */
  async resolveThermalMode({ optionConfig, methodData, origin, destination, shipDate }) {
    const explicit = String(
      methodData?.temperature_control ?? optionConfig?.temperature_control ?? "auto",
    )
      .trim()
      .toLowerCase();

    if (["none", "heat", "cold"].includes(explicit)) {
      return { mode: explicit, reason: "explicit override", source: "override", weatherHold: false };
    }

    const custom = getAutoThermalResolver();
    if (custom) {
      const r = await custom({ origin, destination, shipDate });
      return {
        mode: r?.mode ?? "none",
        reason: r?.reason ?? "custom resolver",
        source: "custom",
        weatherHold: r?.weatherHold === true,
      };
    }

    return this.weather.resolveAutoThermal({ origin, destination, shipDate });
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
      // Livestock. Picking this in Medusa Admin stores the whole object as
      // shipping_option.data, which Medusa hands back as `optionData` on every
      // rate calculation — the only route by which this configuration is
      // readable at calculation time in 2.13.x.
      { ...LIVESTOCK_FULFILLMENT_OPTION },
    ];
  }

  /** True when the shipping option is the livestock one. */
  #isLivestockOption(optionData) {
    return (
      optionData?.id === LIVESTOCK_FULFILLMENT_OPTION_ID ||
      String(optionData?.shipping_type || "").toLowerCase() === "livestock"
    );
  }

  /**
   * Build the livestock shipment, quote it with Shippo and return the UPS Next
   * Day Air rate plus everything fulfillment needs to repack it identically.
   *
   * Throws a MedusaError with customer-safe wording on configuration problems
   * or when UPS Next Day Air is not offered — never silently downgrades.
   */
  async quoteLivestockShipment({ optionConfig, methodData, shippingAddress, items, cartId }) {
    const lines = await this.buildShippingLines(items);
    const { items: livestock, dry, invalid } = expandLivestockItems(lines);

    if (invalid.length) {
      // Server-side detail identifies the offending product; the customer sees
      // only the clean sentence.
      for (const bad of invalid) {
        this.logger.error(
          `[livestock] misconfigured product — product_id=${bad.productId} ` +
            `variant_id=${bad.variantId} title="${bad.title}" reason=${bad.reason}`,
        );
      }
      throw new MedusaError(MedusaError.Types.INVALID_DATA, LIVESTOCK_ERRORS.configuration);
    }

    if (livestock.length === 0) return null; // dry-only cart: caller keeps existing behaviour

    const { parcels, unpackable } = packLivestock(livestock);
    if (unpackable.length || parcels.length === 0) {
      for (const bad of unpackable) {
        this.logger.error(
          `[livestock] item does not fit any configured box — product_id=${bad.productId} ` +
            `variant_id=${bad.variantId} packUnits=${bad.packUnits}`,
        );
      }
      throw new MedusaError(MedusaError.Types.INVALID_DATA, LIVESTOCK_ERRORS.configuration);
    }

    const shipPlan = nextSafeShipDate(new Date());
    const destination = {
      postal_code: shippingAddress?.postal_code,
      country_code: shippingAddress?.country_code || "US",
    };
    const origin = { postal_code: FROM_ADDRESS.zip, country_code: FROM_ADDRESS.country };

    const thermal = await this.resolveThermalMode({
      optionConfig,
      methodData,
      origin,
      destination,
      shipDate: shipPlan.shipDate,
    });

    const shippoParcels = toShippoParcels(parcels, thermal.mode);

    this.logger.info(
      `[livestock] ${livestock.length} live item(s), ${sumUnits(livestock)} pack units -> ` +
        `${parcels.length} parcel(s): ` +
        parcels
          .map(
            (p, i) =>
              `${p.box.id} ${p.box.lengthIn}x${p.box.widthIn}x${p.box.heightIn}in ` +
              `${shippoParcels[i].weight}oz (${p.packUnits}u)`,
          )
          .join(", ") +
        ` | thermal=${thermal.mode} (${thermal.reason})` +
        ` | ship date ${shipPlan.shipDate}${shipPlan.shipsSameDay ? "" : ` (held ${shipPlan.heldDays}d)`}`,
    );

    const serviceLevel = String(
      optionConfig?.service_level_token || LIVESTOCK_SHIPPING_RULES.primaryServiceLevel,
    );

    // Dedup identical quotes across the several recalculations a checkout does.
    const fingerprint = rateFingerprint({
      cartId,
      address: shippingAddress,
      parcels: shippoParcels,
      serviceLevel,
    });
    const cacheKey = `livestock:rate:${fingerprint}`;

    let amount = null;
    let cachedRateId = null;
    let cachedShipmentId = null;
    try {
      const hit = await this.cache.get(cacheKey);
      // Older entries cached a bare number; accept both shapes.
      if (typeof hit === "number" && Number.isFinite(hit)) {
        amount = hit;
      } else if (hit && typeof hit === "object" && Number.isFinite(Number(hit.amount))) {
        amount = Number(hit.amount);
        cachedRateId = hit.rateId ?? null;
        cachedShipmentId = hit.shipmentId ?? null;
      }
      if (amount !== null) {
        this.logger.info(`[livestock] reusing cached ${serviceLevel} rate $${amount}`);
      }
    } catch {
      /* a cache miss must never block a quote */
    }

    let selectedRate = null;
    if (amount === null) {
      let shipment;
      try {
        shipment = await this.shippoRequest("/shipments/", "POST", {
          address_from: FROM_ADDRESS,
          address_to: buildShippoAddressTo(shippingAddress),
          parcels: shippoParcels,
          async: false,
        });
      } catch (err) {
        // Log the detail, show the customer the clean sentence. Never surface
        // a carrier API body or a stack trace at checkout.
        this.logger.error(`[livestock] Shippo shipment request failed: ${err?.message || err}`);
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          LIVESTOCK_ERRORS.serviceUnavailable,
        );
      }

      const rates = shipment?.rates || [];
      this.logger.info(
        `[livestock] Shippo offered ${rates.length} rate(s): ${describeOfferedServiceLevels(rates).join(", ") || "none"}`,
      );

      selectedRate = selectUpsNextDayAirRate(rates, {
        ...LIVESTOCK_SHIPPING_RULES,
        primaryServiceLevel: serviceLevel,
      });

      if (!selectedRate) {
        this.logger.error(
          `[livestock] ${serviceLevel} not offered for ${destination.postal_code} — refusing to substitute a slower service`,
        );
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          LIVESTOCK_ERRORS.serviceUnavailable,
        );
      }

      amount = parseFloat(selectedRate.amount);
      if (!Number.isFinite(amount)) {
        this.logger.error(`[livestock] unparseable rate amount: ${selectedRate.amount}`);
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          LIVESTOCK_ERRORS.serviceUnavailable,
        );
      }

      this.logger.info(
        `[livestock] selected ${selectedRate.provider} ${selectedRate.servicelevel?.token} $${amount}` +
          ` across ${shippoParcels.length} parcel(s)`,
      );

      try {
        await this.cache.set(
          cacheKey,
          {
            amount,
            rateId: selectedRate.object_id ?? null,
            shipmentId: selectedRate.shipment ?? null,
          },
          LIVESTOCK_RATE_CACHE_TTL_SECONDS,
        );
      } catch {
        /* ignore */
      }
    }

    const plan = buildLivestockShipmentPlan({
      parcels,
      thermalMode: thermal.mode,
      shippoParcels,
      dryItemsIncluded: [],
    });

    return {
      carrierAmount: amount,
      parcelCount: shippoParcels.length,
      dryLines: dry,
      // Everything fulfillment needs so it packs what checkout quoted.
      methodData: {
        ...plan,
        weather_hold: thermal.weatherHold === true,
        weather_hold_reason: thermal.weatherHoldReason ?? null,
        hold_at_location: optionConfig?.hold_at_location === true,
        thermal_source: thermal.source,
        thermal_reason: thermal.reason,
        order_date: new Date().toISOString().slice(0, 10),
        safe_ship_date: shipPlan.shipDate,
        safe_ship_weekday: shipPlan.weekday,
        ships_same_day: shipPlan.shipsSameDay,
        rate_fingerprint: fingerprint,
        // Kept so fulfillment can buy the label against the exact rate that
        // was quoted. Survives a cache hit, when selectedRate is not in hand.
        shippo_rate_id: selectedRate?.object_id ?? cachedRateId,
        shippo_shipment_id: selectedRate?.shipment ?? cachedShipmentId,
      },
    };
  }

  async validateFulfillmentData(optionData, data, context) {
    const optionId = optionData?.id || "";

    // Livestock option: recompute the shipment and persist the plan. Medusa
    // stores whatever this returns as shipping_method.data, which is what
    // carries through to the order — so fulfillment packs exactly the parcels
    // checkout quoted instead of guessing again later.
    if (this.#isLivestockOption(optionData)) {
      const shippingAddress = context?.shipping_address;
      if (
        LIVESTOCK_SHIPPING_RULES.requireCompleteShippingAddress &&
        (!shippingAddress?.address_1 || !shippingAddress?.city || !shippingAddress?.postal_code)
      ) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "A complete shipping address is required for livestock shipping.",
        );
      }

      const quote = await this.quoteLivestockShipment({
        optionConfig: optionData,
        methodData: data,
        shippingAddress,
        items: context?.items,
        cartId: context?.id,
      });

      if (quote) return { ...data, ...quote.methodData };
      // No livestock in the cart — nothing livestock-specific to record.
      return { ...data };
    }

    // Pre-existing rule, unchanged: live animals may not use the slower
    // options. The livestock option is handled above and is also acceptable.
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

    // Livestock option: build real parcels and quote UPS Next Day Air.
    // Configuration and service-availability errors propagate so checkout
    // shows the clean message instead of a silently wrong price.
    if (this.#isLivestockOption(optionData)) {
      const quote = await this.quoteLivestockShipment({
        optionConfig: optionData,
        methodData: data,
        shippingAddress,
        items: context?.items,
        cartId: context?.id,
      });

      if (quote) {
        // Carrier rate plus the live handling fee. There is no shipping
        // discount any more: the reward for a live order over $500 is a $50
        // credit toward the NEXT order, granted after checkout by the
        // next-order-credit subscriber. It never changes this quote.
        const amount = quote.carrierAmount + HANDLING_FEE_LIVE;

        this.logger.info(
          `[livestock] carrier $${quote.carrierAmount} + $${HANDLING_FEE_LIVE} handling -> charged $${amount}`,
        );

        return {
          calculated_amount: amount,
          is_calculated_price_tax_inclusive: false,
        };
      }

      // Livestock option on a cart with no livestock in it. Fall through to the
      // existing dry-goods calculation rather than forcing Next Day Air.
      this.logger.info(
        "[livestock] livestock option selected but cart has no livestock — using standard dry-goods calculation",
      );
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

      // Carrier rate plus handling. No shipping discount — the reward for a
      // live order over $500 is a $50 credit toward the next order.
      const cartIsLive = hasLiveAnimals(context?.items);
      const handling = cartIsLive ? HANDLING_FEE_LIVE : HANDLING_FEE_SUPPLIES;
      const totalAmount = carrierAmount + handling;

      this.logger.info(
        `Shippo rate: ${selectedRate.servicelevel?.name} — $${carrierAmount} carrier ` +
          `+ $${handling} handling → $${totalAmount} charged (${selectedRate.provider})`
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
