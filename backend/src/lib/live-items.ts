/* eslint-disable @typescript-eslint/no-explicit-any */
// Which order/cart lines count as LIVE fish & coral.
//
// This is the rule that used to gate free shipping. Free shipping is gone;
// the same rule now decides what counts toward the "$50 off your next order"
// reward, which is a live-only perk.
//
// Eligibility comes from stable product data — an explicit metadata override,
// category handles, or Fish/Coral tags — and NEVER from the product title.
// Titles are unreliable ("Clown Goby" vs "Clownfish Food"), so they are only
// ever used for the shipping handling fee, never for money decisions.
//
// The storefront mirrors these handles/tags in lib/freeShipping.ts so the
// badge a customer sees and the reward they earn always agree.

export const LIVE_CATEGORY_HANDLES = [
  "fish",
  "corals",
  // alternate / legacy handles for the same live groups
  "coral",
  "saltwater-fish",
  "seahorses",
]

export const LIVE_TAG_VALUES = [
  "fish",
  "coral",
  "corals",
  "wysiwyg fish",
  "wysiwyg coral",
  "wysiwyg corals",
]

const norm = (s: string) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim()

/** Per-product classification, gathered from the database. */
export type LiveClassification = {
  /** metadata.free_shipping_eligible — kept as the operator override key. */
  metadata_override: boolean | null
  category_handles: string[]
  tag_values: string[]
}

/** True when this product is live fish or coral. */
export function isLiveProduct(cls: LiveClassification | null | undefined): boolean {
  if (!cls) return false
  if (cls.metadata_override === true) return true
  if (cls.metadata_override === false) return false
  if ((cls.category_handles || []).some((h) => LIVE_CATEGORY_HANDLES.includes(norm(h)))) {
    return true
  }
  return (cls.tag_values || []).some((t) => LIVE_TAG_VALUES.includes(norm(t)))
}

export type LiveSubtotalLine = {
  product_id?: string | null
  /** Gross line total before discounts, in dollars. */
  gross: number
  /** Discounts attributed to this line, in dollars. */
  discounts: number
}

/**
 * Live merchandise subtotal: what the customer actually pays for live fish and
 * coral, after discounts and before shipping or tax.
 *
 * Supplies never contribute — that is the whole point of a live-only reward.
 *
 * @param classifications Map (or plain object) keyed by product_id.
 */
export function liveSubtotal(
  lines: LiveSubtotalLine[],
  classifications: Map<string, LiveClassification> | Record<string, LiveClassification>,
): { liveSubtotal: number; otherSubtotal: number; hasLive: boolean } {
  let live = 0
  let other = 0
  let hasLive = false

  for (const line of lines || []) {
    const key = String(line.product_id ?? "")
    const cls =
      classifications instanceof Map
        ? classifications.get(key)
        : (classifications || ({} as any))[key]
    const net = Number(line.gross || 0) - Number(line.discounts || 0)
    if (isLiveProduct(cls)) {
      hasLive = true
      live += net
    } else {
      other += net
    }
  }

  return { liveSubtotal: live, otherSubtotal: other, hasLive }
}

/**
 * SQL for the classification of a set of products. Kept here next to the rule
 * it feeds so the two can never drift. Uses `?` placeholders for Knex's `raw`.
 */
export function liveClassificationSql(productCount: number): string {
  const marks = Array.from({ length: productCount }, () => "?").join(",")
  return `select p.id,
            p.metadata->>'free_shipping_eligible' as fse,
            coalesce(array_agg(distinct pc.handle)
                     filter (where pc.handle is not null), '{}') as handles,
            coalesce(array_agg(distinct pt.value)
                     filter (where pt.value is not null), '{}') as tags
       from product p
       left join product_category_product pcp on pcp.product_id = p.id
       left join product_category pc on pc.id = pcp.product_category_id
        and pc.deleted_at is null
       left join product_tags ptj on ptj.product_id = p.id
       left join product_tag pt on pt.id = ptj.product_tag_id
        and pt.deleted_at is null
      where p.deleted_at is null and p.id in (${marks})
      group by p.id`
}

/** Shape a raw classification row into a LiveClassification. */
export function rowToClassification(row: any): LiveClassification {
  return {
    metadata_override:
      row?.fse === "true" ? true : row?.fse === "false" ? false : null,
    category_handles: row?.handles || [],
    tag_values: row?.tags || [],
  }
}
