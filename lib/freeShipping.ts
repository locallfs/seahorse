// The ONE free-shipping eligibility rule for the storefront. Free shipping is
// a live Fish & Coral perk: Supplies never qualify, never count toward the
// threshold, and never badge. Eligibility comes from stable product data —
// explicit metadata override, category handles, or Fish/Coral tags — NEVER
// from the product title. The backend (Shippo provider) enforces the same
// rule at checkout with the same handles/tags.

export const FREE_SHIPPING_THRESHOLD = 500;

export const FREE_SHIPPING_CATEGORY_HANDLES = [
  "fish",
  "corals",
  // alternate / legacy handles for the same live groups
  "coral",
  "saltwater-fish",
  "seahorses",
];

export const FREE_SHIPPING_TAG_VALUES = [
  "fish",
  "coral",
  "corals",
  "wysiwyg fish",
  "wysiwyg coral",
  "wysiwyg corals",
];

type EligibleProductLike = {
  metadata?: Record<string, unknown> | null;
  categories?: Array<{ handle?: string | null } | null> | null;
  tags?: Array<{ value?: string | null } | null> | null;
} | null | undefined;

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function isFreeShippingEligible(product: EligibleProductLike): boolean {
  if (!product) return false;
  const override = product.metadata?.free_shipping_eligible;
  if (override === true) return true;
  if (override === false) return false;
  const byCategory = (product.categories ?? []).some(
    (c) =>
      !!c?.handle && FREE_SHIPPING_CATEGORY_HANDLES.includes(normalize(c.handle)),
  );
  if (byCategory) return true;
  return (product.tags ?? []).some(
    (t) =>
      typeof t?.value === "string" &&
      FREE_SHIPPING_TAG_VALUES.includes(normalize(t.value)),
  );
}

/** Badge rule: eligible live product whose displayed price meets the threshold. */
export function qualifiesForFreeShippingBadge(
  product: EligibleProductLike,
  priceAmount: number | null | undefined,
): boolean {
  return (
    isFreeShippingEligible(product) &&
    typeof priceAmount === "number" &&
    priceAmount >= FREE_SHIPPING_THRESHOLD
  );
}
