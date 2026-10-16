/** Types for livestock-packing.js — pure livestock shipping logic. */

import type {
  LivestockBox,
  LivestockShippingRules,
  ThermalMode,
} from "./livestock-config";

export interface ShippingMeta {
  shipping_type?: "livestock" | "dry" | string;
  livestock_type?: string;
  shipping_class?: string;
  shipping_pack_units?: number | string;
  shipping_packed_weight_oz?: number | string;
  can_ship_with_livestock?: boolean | string;
  [key: string]: unknown;
}

export interface CartLineForShipping {
  id?: string | null;
  product_id?: string | null;
  variant_id?: string | null;
  quantity?: number | null;
  title?: string | null;
  meta?: ShippingMeta | null;
}

export interface PackableLivestockItem {
  lineId: string | null;
  productId: string | null;
  variantId: string | null;
  title: string | null;
  shippingClass: string | null;
  livestockType: string | null;
  packUnits: number;
  packedWeightOz: number;
}

export interface InvalidLivestockLine {
  lineId: string | null;
  productId: string | null;
  variantId: string | null;
  title: string | null;
  reason: string;
}

export type ResolvedLineShipping =
  | {
      kind: "livestock";
      shippingClass: string | null;
      livestockType: string | null;
      packUnits: number;
      packedWeightOz: number;
    }
  | { kind: "dry"; canShipWithLivestock: boolean }
  | { kind: "invalid"; reason: string };

export interface LivestockParcel {
  box: LivestockBox;
  items: PackableLivestockItem[];
  packUnits: number;
}

export interface ShippoParcel {
  length: string;
  width: string;
  height: string;
  distance_unit: "in";
  weight: string;
  mass_unit: "oz";
}

export interface ShippoRateLike {
  amount?: string | number;
  provider?: string;
  carrier?: string;
  carrier_account?: { carrier?: string };
  servicelevel?: { token?: string; name?: string };
  servicelevel_token?: string;
  [key: string]: unknown;
}

export interface SafeShipDate {
  shipDate: string;
  weekday: string;
  heldDays: number;
  shipsSameDay: boolean;
}

export class LivestockConfigurationError extends Error {
  offenders: InvalidLivestockLine[];
  constructor(message: string, offenders?: InvalidLivestockLine[]);
}

export const WEEKDAY_NAMES: string[];

export function mergeShippingMeta(
  productMeta: ShippingMeta | null | undefined,
  variantMeta: ShippingMeta | null | undefined,
): ShippingMeta;

export function resolveLineShipping(
  meta: ShippingMeta | null | undefined,
): ResolvedLineShipping;

export function expandLivestockItems(lines: CartLineForShipping[]): {
  items: PackableLivestockItem[];
  dry: Array<CartLineForShipping & { canShipWithLivestock: boolean }>;
  invalid: InvalidLivestockLine[];
};

export function smallestBoxFor(units: number): LivestockBox | null;

export function packLivestock(items: PackableLivestockItem[]): {
  parcels: LivestockParcel[];
  unpackable: PackableLivestockItem[];
};

export function thermalWeightOz(mode: ThermalMode): number;

export function parcelWeightOz(
  parcel: LivestockParcel,
  thermalMode: ThermalMode,
): number;

export function toShippoParcels(
  parcels: LivestockParcel[],
  thermalMode: ThermalMode,
): ShippoParcel[];

export function selectUpsNextDayAirRate(
  rates: ShippoRateLike[] | null | undefined,
  rules?: LivestockShippingRules,
): ShippoRateLike | null;

export function describeOfferedServiceLevels(
  rates: ShippoRateLike[] | null | undefined,
): string[];

export function nextSafeShipDate(
  orderDate: Date,
  rules?: LivestockShippingRules,
): SafeShipDate;

export function rateFingerprint(input: {
  cartId?: string | null;
  address?: {
    postal_code?: string | null;
    province?: string | null;
    country_code?: string | null;
    company?: string | null;
  } | null;
  parcels?: ShippoParcel[] | null;
  serviceLevel: string;
}): string;

export function buildLivestockShipmentPlan(input: {
  parcels: LivestockParcel[];
  thermalMode: ThermalMode;
  shippoParcels: ShippoParcel[];
  dryItemsIncluded?: unknown[];
}): Record<string, unknown>;

export function sumUnits(items: PackableLivestockItem[]): number;
