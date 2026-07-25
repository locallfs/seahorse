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
// Eligibility rules are unchanged: Free Shipping still appears at $500+, and
// Out of Stock still comes from the exact same inventory logic as before —
// this component only lays them out.

export type ProductBadgesProps = {
  outOfStock?: boolean;
  /** First variant's calculated price — Free Shipping shows at $500+. */
  priceAmount?: number | null;
  /** Priority-4 informational labels (rendered last). */
  extraLabels?: string[];
};

export default function ProductBadges({
  outOfStock = false,
  priceAmount,
  extraLabels = [],
}: ProductBadgesProps) {
  const freeShipping = typeof priceAmount === "number" && priceAmount >= 500;
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
