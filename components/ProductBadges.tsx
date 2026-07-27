// The ONE badge layout for product cards. Badges never overlap: they render
// in a single vertical stack pinned to the card image's top-right corner,
// spaced, wrapped, and capped to the card's width.
//
// Display priority (top to bottom — order only; every applicable badge stays
// visible):
//   1. Out of Stock / availability
//   2. Sale / price promotion (slot reserved — none exist today)
//   3. Free Shipping
//   4. Other informational labels
//
// Free Shipping eligibility: the badge is a live Fish & Coral perk. Callers
// pass `freeShippingEligible` from lib/freeShipping's category/tag/metadata
// rule (NEVER title-based); the badge then shows only at the shared
// FREE_SHIPPING_THRESHOLD. Supplies are never eligible, so they never badge.

import { FREE_SHIPPING_THRESHOLD } from "@/lib/freeShipping";

export type ProductBadgesProps = {
  outOfStock?: boolean;
  /** Displayed (lowest enabled-size) price — badge shows at the threshold. */
  priceAmount?: number | null;
  /** From lib/freeShipping isFreeShippingEligible — defaults to NOT eligible. */
  freeShippingEligible?: boolean;
  /** Priority-4 informational labels (rendered last). */
  extraLabels?: string[];
};

export default function ProductBadges({
  outOfStock = false,
  priceAmount,
  freeShippingEligible = false,
  extraLabels = [],
}: ProductBadgesProps) {
  const freeShipping =
    freeShippingEligible &&
    typeof priceAmount === "number" &&
    priceAmount >= FREE_SHIPPING_THRESHOLD;
  if (!outOfStock && !freeShipping && extraLabels.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute top-2 right-2 z-10 flex flex-col items-end gap-1.5 max-w-[calc(100%-1rem)]"
      data-badge-stack
    >
      {outOfStock && (
        <span className="px-2.5 py-1 rounded-md bg-red-600 text-white text-[10px] font-bold tracking-wider uppercase shadow-lg border border-white/40 text-right leading-tight">
          Out of Stock
        </span>
      )}
      {freeShipping && (
        <span className="px-2.5 py-1 rounded-md bg-[#FFD700] text-black text-[10px] font-bold tracking-wider uppercase shadow-lg text-right leading-tight">
          ★ Free Shipping ★
        </span>
      )}
      {extraLabels.map((label) => (
        <span
          key={label}
          className="px-2.5 py-1 rounded-md bg-white/20 backdrop-blur-sm text-white text-[10px] font-medium tracking-wider uppercase shadow text-right leading-tight break-words"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
