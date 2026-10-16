// The ONE live-reward eligibility rule for the storefront.
//
// "Live orders over $500 earn $50 off your next order." A live Fish & Coral
// perk: Supplies never qualify, never count toward the threshold, and never
// badge. Eligibility comes from stable product data, never the product title.
// The backend mirrors these handles/tags in src/lib/live-items.ts.
//
// Free shipping no longer exists; shipping is always carrier rate + handling.

// The ONE free-shipping eligibility rule for the storefront. Free shipping is
// a live Fish & Coral perk: Supplies never qualify, never count toward the
// threshold, and never badge. Eligibility comes from stable product data —
// explicit metadata override, category handles, or Fish/Coral tags — NEVER
// from the product title. The backend (Shippo provider) enforces the same
// rule at checkout with the same handles/tags.

export const LIVE_REWARD_THRESHOLD = 500;
export const LIVE_REWARD_AMOUNT = 50;

export const LIVE_CATEGORY_HANDLES = [
  "fish",
  "corals",
  // alternate / legacy handles for the same live groups
  "coral",
  "saltwater-fish",
  "seahorses",
];

export const LIVE_TAG_VALUES = [
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

export function isLiveProduct(product: EligibleProductLike): boolean {
  if (!product) return false;
  const override = product.metadata?.free_shipping_eligible;
  if (override === true) return true;
  if (override === false) return false;
  const byCategory = (product.categories ?? []).some(
    (c) =>
      !!c?.handle && LIVE_CATEGORY_HANDLES.includes(normalize(c.handle)),
  );
  if (byCategory) return true;
  return (product.tags ?? []).some(
    (t) =>
      typeof t?.value === "string" &&
      LIVE_TAG_VALUES.includes(normalize(t.value)),
  );
}

/** Badge rule: eligible live product whose displayed price meets the threshold. */
export function earnsLiveReward(
  product: EligibleProductLike,
  priceAmount: number | null | undefined,
): boolean {
  return (
    isLiveProduct(product) &&
    typeof priceAmount === "number" &&
    priceAmount > LIVE_REWARD_THRESHOLD
  );
}
