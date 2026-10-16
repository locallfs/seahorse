// The ONE badge layout for product cards. Badges never overlap: they render
// in a single vertical stack pinned to the card image's top-right corner,
// spaced, wrapped, and capped to the card's width.
//
// Display priority (top to bottom — order only; every applicable badge stays
// visible):
//   1. Out of Stock / availability
//   2. Sale / price promotion (slot reserved — none exist today)
//   3. Earns next-order credit
//   4. Other informational labels
//
// Reward eligibility: the badge is a live Fish & Coral perk. Callers
// pass `earnsRewardEligible` from lib/liveReward's category/tag/metadata
// rule (NEVER title-based); the badge then shows only at the shared
// LIVE_REWARD_THRESHOLD. Supplies are never eligible, so they never badge.

import { LIVE_REWARD_AMOUNT, LIVE_REWARD_THRESHOLD } from "@/lib/liveReward";

export type ProductBadgesProps = {
  outOfStock?: boolean;
  /** Displayed (lowest enabled-size) price — badge shows at the threshold. */
  priceAmount?: number | null;
  /** From lib/liveReward isLiveProduct - defaults to NOT eligible. */
  earnsRewardEligible?: boolean;
  /** Priority-4 informational labels (rendered last). */
  extraLabels?: string[];
};

export default function ProductBadges({
  outOfStock = false,
  priceAmount,
  earnsRewardEligible = false,
  extraLabels = [],
}: ProductBadgesProps) {
  const earnsReward =
    earnsRewardEligible &&
    typeof priceAmount === "number" &&
    priceAmount > LIVE_REWARD_THRESHOLD;
  if (!outOfStock && !earnsReward && extraLabels.length === 0) return null;

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
      {earnsReward && (
        <span className="px-2.5 py-1 rounded-md bg-[#FFD700] text-black text-[10px] font-bold tracking-wider uppercase shadow-lg text-right leading-tight">
          ★ Earns ${LIVE_REWARD_AMOUNT} Credit ★
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
