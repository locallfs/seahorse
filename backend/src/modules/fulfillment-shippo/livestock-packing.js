"use strict";
/**
 * Pure livestock shipping logic: metadata resolution, bin packing, parcel
 * weights, Shippo parcel shaping, UPS rate selection, ship-day scheduling and
 * rate fingerprinting.
 *
 * No network, no database, no clock of its own (every date-aware function
 * takes the date in). That is what makes the whole thing testable.
 *
 * All numbers come from livestock-config.js. Nothing here hard-codes a weight,
 * a capacity or a box size.
 */

const {
  LIVESTOCK_SHIPPING_CLASSES,
  LIVESTOCK_BOXES,
  LIVESTOCK_THERMAL_CONFIG,
  LIVESTOCK_SHIPPING_RULES,
} = require("./livestock-config");

const WEEKDAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/** Raised when a product claims to be livestock but cannot be priced. */
class LivestockConfigurationError extends Error {
  /** @param {string} message @param {any[]} offenders */
  constructor(message, offenders) {
    super(message);
    this.name = "LivestockConfigurationError";
    this.offenders = offenders || [];
  }
}

const num = (v) => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

/**
 * Merge product and variant metadata. Variant wins whenever it supplies a
 * value, so a single oddly-sized variant can override its product.
 */
function mergeShippingMeta(productMeta, variantMeta) {
  const out = {};
  for (const src of [productMeta, variantMeta]) {
    if (!src || typeof src !== "object") continue;
    for (const [k, v] of Object.entries(src)) {
      if (v !== null && v !== undefined && v !== "") out[k] = v;
    }
  }
  return out;
}

/**
 * Work out what a line item is and how it packs.
 *
 * Returns a discriminated result rather than throwing, so the caller can
 * gather every offending product before failing once with a full list.
 *
 * @returns {{kind:"livestock", shippingClass:string|null, livestockType:string|null, packUnits:number, packedWeightOz:number}
 *          |{kind:"dry", canShipWithLivestock:boolean}
 *          |{kind:"invalid", reason:string}}
 */
function resolveLineShipping(meta) {
  const m = meta || {};
  const shippingType = String(m.shipping_type || "").trim().toLowerCase();

  if (shippingType === "livestock") {
    const className = m.shipping_class
      ? String(m.shipping_class).trim().toLowerCase()
      : null;
    const cls = className ? LIVESTOCK_SHIPPING_CLASSES[className] : null;

    // Explicit per-product/variant overrides beat the class defaults.
    const overridePackUnits = num(m.shipping_pack_units);
    const overrideWeightOz = num(m.shipping_packed_weight_oz);

    const packUnits = overridePackUnits !== null ? overridePackUnits : cls?.packUnits ?? null;
    const packedWeightOz =
      overrideWeightOz !== null ? overrideWeightOz : cls?.packedWeightOz ?? null;

    if (!cls && overridePackUnits === null && overrideWeightOz === null) {
      return {
        kind: "invalid",
        reason: className
          ? `unknown shipping_class "${className}"`
          : "shipping_type is livestock but no shipping_class or explicit overrides were set",
      };
    }
    if (packUnits === null || packUnits <= 0) {
      return { kind: "invalid", reason: "no usable pack-unit value" };
    }
    if (packedWeightOz === null || packedWeightOz <= 0) {
      return { kind: "invalid", reason: "no usable packed-weight value" };
    }

    return {
      kind: "livestock",
      shippingClass: className,
      livestockType: m.livestock_type
        ? String(m.livestock_type).trim().toLowerCase()
        : cls?.type ?? null,
      packUnits,
      packedWeightOz,
    };
  }

  if (shippingType === "dry") {
    return {
      kind: "dry",
      canShipWithLivestock: m.can_ship_with_livestock === true || m.can_ship_with_livestock === "true",
    };
  }

  // No shipping_type at all: not livestock, so it keeps the pre-existing
  // dry-goods behaviour. Livestock must be opted into explicitly — that is
  // what stops an unmarked product silently shipping as a $0-weight animal.
  return { kind: "dry", canShipWithLivestock: false };
}

/**
 * Turn cart lines into individually packable livestock items — one per unit of
 * quantity, because two medium fish need two bags, not one double-size bag.
 *
 * @param {Array<{id?:string, product_id?:string, variant_id?:string, quantity?:number, title?:string, meta?:any}>} lines
 */
function expandLivestockItems(lines) {
  const items = [];
  const dry = [];
  const invalid = [];

  for (const line of lines || []) {
    const resolved = resolveLineShipping(line.meta);
    const qty = Math.max(1, Math.floor(num(line.quantity) ?? 1));

    if (resolved.kind === "invalid") {
      invalid.push({
        lineId: line.id ?? null,
        productId: line.product_id ?? null,
        variantId: line.variant_id ?? null,
        title: line.title ?? null,
        reason: resolved.reason,
      });
      continue;
    }

    if (resolved.kind === "dry") {
      dry.push({ ...line, canShipWithLivestock: resolved.canShipWithLivestock });
      continue;
    }

    for (let i = 0; i < qty; i++) {
      items.push({
        lineId: line.id ?? null,
        productId: line.product_id ?? null,
        variantId: line.variant_id ?? null,
        title: line.title ?? null,
        shippingClass: resolved.shippingClass,
        livestockType: resolved.livestockType,
        packUnits: resolved.packUnits,
        packedWeightOz: resolved.packedWeightOz,
      });
    }
  }

  return { items, dry, invalid };
}

const boxesAsc = () => [...LIVESTOCK_BOXES].sort((a, b) => a.maxPackUnits - b.maxPackUnits);

/** Smallest configured box that can hold `units`, or null if none can. */
function smallestBoxFor(units) {
  return boxesAsc().find((b) => units <= b.maxPackUnits) || null;
}

const largestBox = () => boxesAsc()[boxesAsc().length - 1];

const sumUnits = (items) => items.reduce((t, i) => t + i.packUnits, 0);

/**
 * First-fit-decreasing bin packing, then shrink each bin to the smallest box
 * that still holds it.
 *
 * Preference order, as required: fewest boxes first, then smallest boxes for
 * the same count. Pack units are additive, so if the total fits inside one
 * box's capacity it genuinely fits in one box — that case is taken directly.
 *
 * Never exceeds a box's maxPackUnits.
 */
function packLivestock(items) {
  const list = [...(items || [])].sort(
    // Largest first; tie-break on weight then class so packing is deterministic.
    (a, b) =>
      b.packUnits - a.packUnits ||
      b.packedWeightOz - a.packedWeightOz ||
      String(a.shippingClass).localeCompare(String(b.shippingClass)),
  );

  if (list.length === 0) return { parcels: [], unpackable: [] };

  const biggest = largestBox();

  // A single item too big for the largest box can never be packed.
  const unpackable = list.filter((i) => i.packUnits > biggest.maxPackUnits);
  if (unpackable.length) return { parcels: [], unpackable };

  const total = sumUnits(list);

  // Fits in one box: use the smallest one that takes the whole shipment.
  const single = smallestBoxFor(total);
  if (single) {
    return { parcels: [{ box: single, items: list, packUnits: total }], unpackable: [] };
  }

  // Too much for one box: first-fit-decreasing into largest-box-sized bins to
  // keep the box count down.
  const bins = [];
  for (const item of list) {
    let placed = false;
    for (const bin of bins) {
      if (bin.packUnits + item.packUnits <= biggest.maxPackUnits) {
        bin.items.push(item);
        bin.packUnits += item.packUnits;
        placed = true;
        break;
      }
    }
    if (!placed) bins.push({ items: [item], packUnits: item.packUnits });
  }

  // Each bin then drops to the smallest box that still fits its real contents.
  const parcels = bins.map((bin) => ({
    box: smallestBoxFor(bin.packUnits) || biggest,
    items: bin.items,
    packUnits: bin.packUnits,
  }));

  return { parcels, unpackable: [] };
}

/** Thermal pack weight for one parcel, in ounces. */
function thermalWeightOz(mode) {
  if (mode === "heat") return LIVESTOCK_THERMAL_CONFIG.heatPackWeightOz;
  if (mode === "cold") return LIVESTOCK_THERMAL_CONFIG.coldPackWeightOz;
  return 0;
}

/**
 * Actual shipping weight of one finished parcel, built from the items really
 * assigned to it — never apportioned after the fact.
 *
 *   contents + box tare + thermal pack + buffer
 */
function parcelWeightOz(parcel, thermalMode) {
  const contents = parcel.items.reduce((t, i) => t + i.packedWeightOz, 0);
  return (
    contents +
    parcel.box.tareWeightOz +
    thermalWeightOz(thermalMode) +
    LIVESTOCK_THERMAL_CONFIG.shippingWeightBufferOz
  );
}

/**
 * Shape parcels for the Shippo API. Strings and explicit units, which is what
 * Shippo expects; ounces are declared rather than converted so no rounding
 * creeps in.
 */
function toShippoParcels(parcels, thermalMode) {
  return parcels.map((p) => ({
    length: String(p.box.lengthIn),
    width: String(p.box.widthIn),
    height: String(p.box.heightIn),
    distance_unit: "in",
    weight: String(parcelWeightOz(p, thermalMode)),
    mass_unit: "oz",
  }));
}

/**
 * Find the UPS Next Day Air rate, defensively.
 *
 * Shippo has shipped several response shapes over the years: `servicelevel` as
 * an object, a flattened `servicelevel_token`, carrier under `provider` or
 * `carrier_account`. All are checked. Never falls back to another service —
 * that is the whole point.
 */
function selectUpsNextDayAirRate(rates, rules = LIVESTOCK_SHIPPING_RULES) {
  const wantToken = String(rules.primaryServiceLevel).toLowerCase();
  const wantCarrier = String(rules.carrier).toLowerCase();

  const tokenOf = (r) =>
    String(r?.servicelevel?.token ?? r?.servicelevel_token ?? "").toLowerCase();
  const carrierOf = (r) =>
    String(r?.provider ?? r?.carrier ?? r?.carrier_account?.carrier ?? "").toLowerCase();

  const candidates = (rates || []).filter(
    (r) => tokenOf(r) === wantToken && carrierOf(r).includes(wantCarrier),
  );

  if (candidates.length === 0) return null;

  // More than one UPS NDA rate can come back across carrier accounts; take the
  // cheapest so the customer is never overcharged.
  return candidates
    .slice()
    .sort((a, b) => (Number(a.amount) || Infinity) - (Number(b.amount) || Infinity))[0];
}

/** Service levels Shippo offered, for logs and diagnostics. */
function describeOfferedServiceLevels(rates) {
  return (rates || []).map((r) => {
    const token = r?.servicelevel?.token ?? r?.servicelevel_token ?? "unknown";
    const carrier = r?.provider ?? r?.carrier ?? "unknown";
    return `${carrier}:${token}@${r?.amount ?? "?"}`;
  });
}

/**
 * Next day livestock may actually leave, given the order date.
 *
 * An order placed Friday through Sunday is perfectly acceptable — it just
 * ships on the next allowed day. Order date and safe ship date are different
 * things and this keeps them that way.
 *
 * @param {Date} orderDate
 * @returns {{ shipDate: string, weekday: string, heldDays: number, shipsSameDay: boolean }}
 */
function nextSafeShipDate(orderDate, rules = LIVESTOCK_SHIPPING_RULES) {
  const allowed = new Set((rules.allowedShipWeekdays || []).map((d) => d.toLowerCase()));
  const start = new Date(orderDate.getTime());

  for (let offset = 0; offset <= 14; offset++) {
    const d = new Date(start.getTime());
    d.setDate(d.getDate() + offset);
    const weekday = WEEKDAY_NAMES[d.getDay()];
    if (allowed.has(weekday)) {
      return {
        shipDate: d.toISOString().slice(0, 10),
        weekday,
        heldDays: offset,
        shipsSameDay: offset === 0,
      };
    }
  }

  // Only reachable if allowedShipWeekdays is empty or nonsense.
  return {
    shipDate: start.toISOString().slice(0, 10),
    weekday: WEEKDAY_NAMES[start.getDay()],
    heldDays: 0,
    shipsSameDay: true,
  };
}

/**
 * Deterministic fingerprint of everything that can move the rate. Two carts
 * that fingerprint the same are genuinely interchangeable for quoting; change
 * a postal code, a parcel or the service level and the fingerprint changes.
 */
function rateFingerprint({ cartId, address, parcels, serviceLevel }) {
  const a = address || {};
  const dest = [
    String(a.postal_code || "").trim().toUpperCase(),
    String(a.province || "").trim().toUpperCase(),
    String(a.country_code || "").trim().toUpperCase(),
    // Residential/commercial moves UPS pricing, so it belongs in the key.
    a.company ? "C" : "R",
  ].join("|");

  const parcelPart = (parcels || [])
    .map((p) => `${p.length}x${p.width}x${p.height}:${p.weight}${p.mass_unit}`)
    .sort()
    .join(",");

  return [cartId || "no-cart", dest, parcelPart, serviceLevel].join("::");
}

/**
 * Everything about the shipment worth keeping on the shipping method, so
 * fulfillment packs exactly what checkout quoted.
 */
function buildLivestockShipmentPlan({ parcels, thermalMode, shippoParcels, dryItemsIncluded }) {
  return {
    shipping_type: "livestock",
    carrier: LIVESTOCK_SHIPPING_RULES.carrier,
    service_level: LIVESTOCK_SHIPPING_RULES.primaryServiceLevel,
    live_arrival_guarantee: LIVESTOCK_SHIPPING_RULES.liveArrivalGuarantee,
    temperature_control: thermalMode,
    parcel_count: parcels.length,
    parcels: parcels.map((p, i) => ({
      box_id: p.box.id,
      length_in: p.box.lengthIn,
      width_in: p.box.widthIn,
      height_in: p.box.heightIn,
      pack_units: p.packUnits,
      weight_oz: Number(shippoParcels[i].weight),
      contents: p.items.map((it) => ({
        variant_id: it.variantId,
        product_id: it.productId,
        shipping_class: it.shippingClass,
        livestock_type: it.livestockType,
        packed_weight_oz: it.packedWeightOz,
        pack_units: it.packUnits,
      })),
    })),
    dry_items_packed_with_livestock: dryItemsIncluded || [],
  };
}

module.exports = {
  LivestockConfigurationError,
  WEEKDAY_NAMES,
  mergeShippingMeta,
  resolveLineShipping,
  expandLivestockItems,
  smallestBoxFor,
  packLivestock,
  thermalWeightOz,
  parcelWeightOz,
  toShippoParcels,
  selectUpsNextDayAirRate,
  describeOfferedServiceLevels,
  nextSafeShipDate,
  rateFingerprint,
  buildLivestockShipmentPlan,
  sumUnits,
};
