/** Types for livestock-config.js — the single source of shipping configuration. */

export type ThermalMode = "none" | "heat" | "cold";

export type LivestockType = "fish" | "coral";

export type LivestockShippingClassId =
  | "coral_frag"
  | "coral_small"
  | "coral_medium"
  | "coral_large"
  | "fish_small"
  | "fish_medium"
  | "fish_large"
  | "fish_xlarge";

export interface LivestockShippingClass {
  type: LivestockType;
  /** Abstract space allowance used by the packer. */
  packUnits: number;
  /** Estimated shipping weight contribution: animal + water + bag + packing. */
  packedWeightOz: number;
}

export interface LivestockBox {
  id: string;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  maxPackUnits: number;
  /** Empty box plus normal insulation, before contents. */
  tareWeightOz: number;
}

export interface LivestockThermalConfig {
  heatPackWeightOz: number;
  coldPackWeightOz: number;
  shippingWeightBufferOz: number;
}

export type Weekday =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export interface LivestockShippingRules {
  carrier: string;
  primaryServiceLevel: string;
  allowedShipWeekdays: Weekday[];
  fridayShipping: boolean;
  saturdayShipping: boolean;
  liveArrivalGuarantee: boolean;
  weatherHoldSupported: boolean;
  holdAtLocationSupported: boolean;
  requireCompleteShippingAddress: boolean;
}

export interface LivestockWeatherConfig {
  enabled: boolean;
  includeOrigin: boolean;
  geocodeBaseUrl: string;
  forecastBaseUrl: string;
  timeoutMs: number;
  cacheTtlSeconds: number;
  coldThresholdF: number;
  hotThresholdF: number;
  hardFreezeF: number;
  extremeHeatF: number;
}

/** Becomes `shipping_option.data`, returned to the provider as `optionData`. */
export interface LivestockFulfillmentOption {
  id: string;
  name: string;
  is_return: boolean;
  shipping_type: "livestock";
  carrier: string;
  service_level_token: string;
  live_arrival_guarantee: boolean;
  temperature_control: ThermalMode | "auto";
  weather_hold: boolean;
  hold_at_location: boolean;
  max_transit_days: number;
}

export interface AutoThermalResult {
  mode: ThermalMode;
  reason: string;
}

export const LIVESTOCK_SHIPPING_CLASSES: Record<
  LivestockShippingClassId,
  LivestockShippingClass
>;
export const LIVESTOCK_BOXES: LivestockBox[];
export const LIVESTOCK_THERMAL_CONFIG: LivestockThermalConfig;
export const LIVESTOCK_SHIPPING_RULES: LivestockShippingRules;
export const LIVESTOCK_WEATHER_CONFIG: LivestockWeatherConfig;
export const LIVESTOCK_FULFILLMENT_OPTION: LivestockFulfillmentOption;
export const LIVESTOCK_FULFILLMENT_OPTION_ID: string;
export const LIVESTOCK_RATE_CACHE_TTL_SECONDS: number;
export const LIVESTOCK_ERRORS: {
  serviceUnavailable: string;
  configuration: string;
};
export const AUTO_THERMAL_FALLBACK_MODE: ThermalMode;
export function setAutoThermalResolver(
  fn: ((ctx: unknown) => AutoThermalResult) | null,
): void;
export function getAutoThermalResolver(): ((ctx: unknown) => AutoThermalResult) | null;
