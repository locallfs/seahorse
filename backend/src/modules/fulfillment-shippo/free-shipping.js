"use strict";
// Pure decision core for checkout free shipping. Free shipping is a live
// Fish & Coral perk only:
//   - eligibility comes from stable product data (explicit metadata override,
//     category handles, Fish/Coral tags) — NEVER the product title;
//   - only the live Fish/Coral line subtotal counts toward the threshold;
//   - supplies never qualify, never contribute, and stay chargeable in a
//     mixed cart (the cart is then charged as a supplies-only shipment).
// The category handles / tag values mirror the storefront's lib/freeShipping
// so the badge a customer sees and the checkout total always agree.

const FREE_SHIPPING_THRESHOLD = 500;

const ELIGIBLE_CATEGORY_HANDLES = [
  "fish",
  "corals",
  "coral",
  "saltwater-fish",
  "seahorses",
];

const ELIGIBLE_TAG_VALUES = [
  "fish",
  "coral",
  "corals",
  "wysiwyg fish",
  "wysiwyg coral",
  "wysiwyg corals",
];

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

// classification: { metadata_override: true|false|null,
//                   category_handles: string[], tag_values: string[] }
function isEligibleClassification(cls) {
  if (!cls) return false;
  if (cls.metadata_override === true) return true;
  if (cls.metadata_override === false) return false;
  if (
    (cls.category_handles || []).some((h) =>
      ELIGIBLE_CATEGORY_HANDLES.includes(norm(h))
    )
  ) {
    return true;
  }
  return (cls.tag_values || []).some((t) => ELIGIBLE_TAG_VALUES.includes(norm(t)));
}

// items: [{ product_id, unit_price, quantity }]
// classifications: plain object or Map keyed by product_id.
function summarizeCart(items, classifications) {
  let liveSubtotal = 0;
  let hasEligibleLive = false;
  let hasOtherItems = false;
  for (const item of items || []) {
    const cls =
      classifications instanceof Map
        ? classifications.get(item.product_id)
        : (classifications || {})[item.product_id];
    const line = Number(item.unit_price || 0) * Number(item.quantity || 1);
    if (isEligibleClassification(cls)) {
      hasEligibleLive = true;
      liveSubtotal += line;
    } else {
      hasOtherItems = true;
    }
  }
  return {
    liveSubtotal,
    hasEligibleLive,
    hasOtherItems,
    qualifies: hasEligibleLive && liveSubtotal >= FREE_SHIPPING_THRESHOLD,
  };
}

// Supply line items of the cart — everything NOT classified as eligible live
// Fish/Coral (so inverts, macro, equipment, and unclassified products are all
// treated as the chargeable portion).
function filterSupplyItems(items, classifications) {
  return (items || []).filter((item) => {
    const cls =
      classifications instanceof Map
        ? classifications.get(item.product_id)
        : (classifications || {})[item.product_id];
    return !isEligibleClassification(cls);
  });
}

// Builds the request body for a GENUINE supplies-only Shippo quote: only the
// supply line items are considered, packed under the supplies packaging rule,
// to the customer's actual destination. No fish/coral line-item data reaches
// the request. Returns null when the cart has no supply items — a live-only
// cart needs no supplies quote.
function buildSuppliesOnlyShipment({
  addressFrom,
  addressTo,
  items,
  classifications,
  suppliesParcel,
}) {
  const supplyItems = filterSupplyItems(items, classifications);
  if (supplyItems.length === 0) return null;
  return {
    supplyItems,
    request: {
      address_from: addressFrom,
      address_to: addressTo,
      parcels: [suppliesParcel],
      async: false,
    },
  };
}

// summary null/undefined (classification unavailable) fails SAFE: full price.
//
// The waiver is the whole cost attributable to the live portion:
//   live-only qualifying cart  → $0 (everything waived);
//   mixed qualifying cart      → the customer pays the ACTUAL supplies-only
//     carrier quote (a separate Shippo shipment built from the supply items
//     alone) + the supplies handling fee. The livestock-forced overnight
//     rate and the live handling fee are waived in full.
//   supplies-only quote unavailable → the normal UNDISCOUNTED charge — we
//     never guess and never substitute a rate from the mixed/livestock
//     shipment's response.
function decideShippingCharge({
  /** carrier rate of the option the customer selected (overnight when live) */
  carrierAmount,
  /** carrier rate from the separate supplies-only shipment quote, or null */
  suppliesOnlyCarrierAmount,
  handlingLive,
  handlingSupplies,
  cartHasLiveAnimals,
  summary,
}) {
  const normal =
    carrierAmount + (cartHasLiveAnimals ? handlingLive : handlingSupplies);
  if (!summary || !summary.qualifies) {
    return { amount: normal, waived: 0, freeLivePortion: false, reason: "not_qualifying" };
  }
  if (!summary.hasOtherItems) {
    return { amount: 0, waived: normal, freeLivePortion: true, reason: "live_only_free" };
  }
  if (
    suppliesOnlyCarrierAmount == null ||
    !Number.isFinite(Number(suppliesOnlyCarrierAmount))
  ) {
    return {
      amount: normal,
      waived: 0,
      freeLivePortion: false,
      reason: "supplies_quote_unavailable",
    };
  }
  const suppliesOnly = Number(suppliesOnlyCarrierAmount) + handlingSupplies;
  // The discounted charge can never exceed the normal charge.
  const amount = Math.min(suppliesOnly, normal);
  return {
    amount,
    waived: normal - amount,
    freeLivePortion: true,
    reason: "mixed_supplies_only_charge",
  };
}

module.exports = {
  FREE_SHIPPING_THRESHOLD,
  ELIGIBLE_CATEGORY_HANDLES,
  ELIGIBLE_TAG_VALUES,
  isEligibleClassification,
  summarizeCart,
  filterSupplyItems,
  buildSuppliesOnlyShipment,
  decideShippingCharge,
};
