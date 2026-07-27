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

// summary null/undefined (classification unavailable) fails SAFE: full price.
function decideShippingCharge({
  carrierAmount,
  handlingLive,
  handlingSupplies,
  cartHasLiveAnimals,
  summary,
}) {
  const normal =
    carrierAmount + (cartHasLiveAnimals ? handlingLive : handlingSupplies);
  if (!summary || !summary.qualifies) {
    return { amount: normal, freeLivePortion: false };
  }
  if (!summary.hasOtherItems) {
    return { amount: 0, freeLivePortion: true };
  }
  // Mixed cart: the live portion rides free, the supplies portion is charged
  // exactly like a supplies-only shipment (carrier rate + supplies handling).
  return { amount: carrierAmount + handlingSupplies, freeLivePortion: true };
}

module.exports = {
  FREE_SHIPPING_THRESHOLD,
  ELIGIBLE_CATEGORY_HANDLES,
  ELIGIBLE_TAG_VALUES,
  isEligibleClassification,
  summarizeCart,
  decideShippingCharge,
};
