"use strict";
/**
 * THE one place to change livestock shipping behaviour.
 *
 * Everything operational lives here: shipping classes, box sizes and
 * capacities, tare weights, thermal pack weights, allowed ship days and the
 * UPS service level. Nothing in this directory should hard-code any of these
 * numbers — import them from here.
 *
 * Weights are OUNCES and dimensions are INCHES throughout the livestock path.
 * They are converted once, at the Shippo boundary, in livestock-packing.js.
 * (The pre-existing dry-goods path still speaks lb/in to Shippo; both are
 * valid because each parcel declares its own mass_unit.)
 *
 * Types live in livestock-config.d.ts so TypeScript consumers and the test
 * suite get full checking against this file.
 */

/**
 * Estimated SHIPPING weight contribution per livestock item — NOT the weight
 * of the animal. Each figure is meant to cover the animal or coral, its water,
 * its bag or container, and the normal internal packing that goes with it.
 *
 * `packUnits` is an abstract volume/space allowance used by the packer; it is
 * what decides how many items fit in a box, not the weight.
 *
 * Verify these against real bags on a real scale — see README.
 */
const LIVESTOCK_SHIPPING_CLASSES = {
  coral_frag: { type: "coral", packUnits: 0.5, packedWeightOz: 12 },
  coral_small: { type: "coral", packUnits: 1, packedWeightOz: 20 },
  coral_medium: { type: "coral", packUnits: 2, packedWeightOz: 32 },
  coral_large: { type: "coral", packUnits: 3, packedWeightOz: 48 },

  fish_small: { type: "fish", packUnits: 1, packedWeightOz: 24 },
  fish_medium: { type: "fish", packUnits: 2, packedWeightOz: 48 },
  fish_large: { type: "fish", packUnits: 4, packedWeightOz: 80 },
  fish_xlarge: { type: "fish", packUnits: 6, packedWeightOz: 128 },
};

/**
 * The insulated boxes actually stocked for livestock, smallest first.
 *
 * `maxPackUnits` is the operational capacity of the box — adjust freely, the
 * packing algorithm reads it and never assumes a particular value.
 * `tareWeightOz` is the empty box plus its normal insulation/packaging, before
 * any livestock goes in.
 *
 * Order matters: the packer relies on this list being sorted ascending by
 * capacity, and asserts it at load time.
 */
const LIVESTOCK_BOXES = [
  { id: "live_small", lengthIn: 6, widthIn: 6, heightIn: 6, maxPackUnits: 2, tareWeightOz: 10 },
  { id: "live_medium", lengthIn: 12, widthIn: 12, heightIn: 12, maxPackUnits: 8, tareWeightOz: 24 },
  { id: "live_large", lengthIn: 18, widthIn: 14, heightIn: 14, maxPackUnits: 18, tareWeightOz: 40 },
];

/**
 * Thermal packs and the safety buffer, applied PER PARCEL — every box needs
 * its own heat pack, so a two-box shipment carries two.
 */
const LIVESTOCK_THERMAL_CONFIG = {
  heatPackWeightOz: 4,
  coldPackWeightOz: 16,
  shippingWeightBufferOz: 8,
};

/**
 * Operational live-arrival rules. These are shipping policy, deliberately kept
 * separate from price calculation.
 */
const LIVESTOCK_SHIPPING_RULES = {
  carrier: "UPS",
  primaryServiceLevel: "ups_next_day_air",

  allowedShipWeekdays: ["monday", "tuesday", "wednesday", "thursday"],

  fridayShipping: false,
  saturdayShipping: false,

  liveArrivalGuarantee: true,
  weatherHoldSupported: true,
  holdAtLocationSupported: true,
  requireCompleteShippingAddress: true,
};

/**
 * Live weather lookup, used by `thermal_control: "auto"`.
 *
 * Two keyless public services, so there is no secret to leak and no bill:
 *   - api.zippopotam.us  postal code -> latitude/longitude
 *   - api.open-meteo.com latitude/longitude -> daily min/max temperature
 *
 * Both origin and destination are checked and the harsher of the two wins: the
 * box sits in a truck leaving Portland as well as arriving somewhere cold.
 *
 * A weather lookup must never be able to break checkout. Every failure path
 * falls back to AUTO_THERMAL_FALLBACK_MODE and logs why.
 */
const LIVESTOCK_WEATHER_CONFIG = {
  enabled: (process.env.LIVESTOCK_WEATHER_ENABLED || "true").toLowerCase() !== "false",

  geocodeBaseUrl: "https://api.zippopotam.us",
  forecastBaseUrl: "https://api.open-meteo.com/v1/forecast",

  /**
   * Include the Portland origin forecast in the decision, not just the
   * destination. Physically correct — the box sits in a truck leaving here —
   * but it means a cold Portland morning puts a heat pack in every order.
   * Set LIVESTOCK_WEATHER_INCLUDE_ORIGIN=false for destination-only.
   */
  includeOrigin:
    (process.env.LIVESTOCK_WEATHER_INCLUDE_ORIGIN || "true").toLowerCase() !== "false",

  /** Give up this fast so a slow forecast never stalls a rate quote. */
  timeoutMs: Number(process.env.LIVESTOCK_WEATHER_TIMEOUT_MS || 2500),

  /** Forecasts change slowly; an hour of reuse is plenty. */
  cacheTtlSeconds: Number(process.env.LIVESTOCK_WEATHER_CACHE_TTL_SECONDS || 3600),

  /** At or below this low, send a heat pack. */
  coldThresholdF: Number(process.env.LIVESTOCK_COLD_THRESHOLD_F || 50),
  /** At or above this high, send a cold pack. */
  hotThresholdF: Number(process.env.LIVESTOCK_HOT_THRESHOLD_F || 85),

  /**
   * Beyond these, a thermal pack is not enough and the shipment should be held
   * for a better day. This only RECOMMENDS a hold — it never cancels an order
   * or changes what the customer was charged.
   */
  hardFreezeF: Number(process.env.LIVESTOCK_HARD_FREEZE_F || 25),
  extremeHeatF: Number(process.env.LIVESTOCK_EXTREME_HEAT_F || 100),
};

/**
 * Fallback for `thermal_control: "auto"` when the live lookup is disabled,
 * times out, or the destination cannot be geocoded.
 *
 * Set LIVESTOCK_AUTO_THERMAL to "heat" | "cold" | "none" to steer it
 * seasonally from Railway without a deploy.
 */
const AUTO_THERMAL_FALLBACK_MODE = (() => {
  const raw = (process.env.LIVESTOCK_AUTO_THERMAL || "none").trim().toLowerCase();
  return ["none", "heat", "cold"].includes(raw) ? raw : "none";
})();

/** @type {null | ((ctx: any) => { mode: "none"|"heat"|"cold", reason: string })} */
let autoThermalResolver = null;

/**
 * Register a real weather/temperature resolver. Until something calls this,
 * `auto` uses AUTO_THERMAL_FALLBACK_MODE and never pretends to know better.
 */
function setAutoThermalResolver(fn) {
  autoThermalResolver = typeof fn === "function" ? fn : null;
}

function getAutoThermalResolver() {
  return autoThermalResolver;
}

/** The fulfillment option the provider advertises for livestock. */
const LIVESTOCK_FULFILLMENT_OPTION_ID = "shippo-livestock-next-day";

/**
 * This object becomes `shipping_option.data` when an admin creates the
 * shipping option and picks this fulfillment option, and it is handed straight
 * back to the provider as `optionData` on every rate calculation. Medusa does
 * NOT pass `shipping_option.metadata` into calculatePrice in 2.13.x, so the
 * configuration has to travel here to be readable at calculation time.
 */
const LIVESTOCK_FULFILLMENT_OPTION = {
  id: LIVESTOCK_FULFILLMENT_OPTION_ID,
  name: "UPS Next Day Air - Live Arrival Guarantee",
  is_return: false,
  shipping_type: "livestock",
  carrier: LIVESTOCK_SHIPPING_RULES.carrier,
  service_level_token: LIVESTOCK_SHIPPING_RULES.primaryServiceLevel,
  live_arrival_guarantee: LIVESTOCK_SHIPPING_RULES.liveArrivalGuarantee,
  temperature_control: "auto",
  weather_hold: LIVESTOCK_SHIPPING_RULES.weatherHoldSupported,
  hold_at_location: LIVESTOCK_SHIPPING_RULES.holdAtLocationSupported,
  max_transit_days: 1,
};

/** How long a quoted rate may be reused for an identical shipment. */
const LIVESTOCK_RATE_CACHE_TTL_SECONDS = Number(
  process.env.LIVESTOCK_RATE_CACHE_TTL_SECONDS || 120,
);

/** Customer-facing copy. Deliberately free of internals. */
const LIVESTOCK_ERRORS = {
  serviceUnavailable:
    "UPS Next Day Air is not currently available for this shipping address. " +
    "Please verify your address or contact us for assistance with livestock shipping.",
  configuration:
    "We couldn't calculate shipping for one or more livestock items. " +
    "Please contact us for assistance.",
};

// Guard the ordering assumption the packer depends on, at load time rather
// than as a mystery mis-pack later.
for (let i = 1; i < LIVESTOCK_BOXES.length; i++) {
  if (LIVESTOCK_BOXES[i].maxPackUnits <= LIVESTOCK_BOXES[i - 1].maxPackUnits) {
    throw new Error(
      "LIVESTOCK_BOXES must be sorted ascending by maxPackUnits " +
        `(${LIVESTOCK_BOXES[i - 1].id} -> ${LIVESTOCK_BOXES[i].id})`,
    );
  }
}

module.exports = {
  LIVESTOCK_SHIPPING_CLASSES,
  LIVESTOCK_BOXES,
  LIVESTOCK_THERMAL_CONFIG,
  LIVESTOCK_SHIPPING_RULES,
  LIVESTOCK_WEATHER_CONFIG,
  LIVESTOCK_FULFILLMENT_OPTION,
  LIVESTOCK_FULFILLMENT_OPTION_ID,
  LIVESTOCK_RATE_CACHE_TTL_SECONDS,
  LIVESTOCK_ERRORS,
  AUTO_THERMAL_FALLBACK_MODE,
  setAutoThermalResolver,
  getAutoThermalResolver,
};
