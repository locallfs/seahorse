import { describe, it, expect } from "vitest"
import {
  isLiveProduct,
  liveSubtotal,
  liveClassificationSql,
  rowToClassification,
  LIVE_CATEGORY_HANDLES,
  LIVE_TAG_VALUES,
  type LiveClassification,
} from "../live-items"

const cls = (over: Partial<LiveClassification>): LiveClassification => ({
  metadata_override: null,
  category_handles: [],
  tag_values: [],
  ...over,
})

const fish = cls({ category_handles: ["fish"] })
const coral = cls({ category_handles: ["corals"] })
const supply = cls({ category_handles: ["supplies"], tag_values: ["Supplies"] })

describe("live classification", () => {
  it("fish and coral categories are live; supplies are not", () => {
    expect(isLiveProduct(fish)).toBe(true)
    expect(isLiveProduct(coral)).toBe(true)
    expect(isLiveProduct(supply)).toBe(false)
  })

  it("accepts the legacy handles too", () => {
    for (const h of LIVE_CATEGORY_HANDLES) {
      expect(isLiveProduct(cls({ category_handles: [h] })), h).toBe(true)
    }
  })

  it("accepts the live tags, case and spacing insensitive", () => {
    for (const t of LIVE_TAG_VALUES) {
      expect(isLiveProduct(cls({ tag_values: [t.toUpperCase()] })), t).toBe(true)
    }
    expect(isLiveProduct(cls({ tag_values: ["  WYSIWYG   Coral  "] }))).toBe(true)
  })

  it("an explicit metadata override wins both ways", () => {
    expect(isLiveProduct(cls({ metadata_override: true, category_handles: ["supplies"] }))).toBe(true)
    expect(isLiveProduct(cls({ metadata_override: false, category_handles: ["fish"] }))).toBe(false)
  })

  it("an unclassified or missing product is not live", () => {
    expect(isLiveProduct(cls({}))).toBe(false)
    expect(isLiveProduct(null)).toBe(false)
    expect(isLiveProduct(undefined)).toBe(false)
  })
})

describe("live subtotal", () => {
  const classifications = new Map<string, LiveClassification>([
    ["prod_fish", fish],
    ["prod_coral", coral],
    ["prod_salt", supply],
  ])

  it("counts only live lines, net of discounts", () => {
    const r = liveSubtotal(
      [
        { product_id: "prod_fish", gross: 400, discounts: 0 },
        { product_id: "prod_coral", gross: 200, discounts: 50 },
        { product_id: "prod_salt", gross: 300, discounts: 0 },
      ],
      classifications
    )
    expect(r.liveSubtotal).toBe(550) // 400 + (200-50)
    expect(r.otherSubtotal).toBe(300)
    expect(r.hasLive).toBe(true)
  })

  it("a big supplies order contributes nothing to the live total", () => {
    const r = liveSubtotal(
      [{ product_id: "prod_salt", gross: 900, discounts: 0 }],
      classifications
    )
    expect(r.liveSubtotal).toBe(0)
    expect(r.otherSubtotal).toBe(900)
    expect(r.hasLive).toBe(false)
  })

  it("treats an unclassified product as not live, never as free money", () => {
    const r = liveSubtotal(
      [{ product_id: "prod_unknown", gross: 999, discounts: 0 }],
      classifications
    )
    expect(r.liveSubtotal).toBe(0)
    expect(r.hasLive).toBe(false)
  })

  it("handles a line with no product id", () => {
    const r = liveSubtotal([{ product_id: null, gross: 100, discounts: 0 }], classifications)
    expect(r.liveSubtotal).toBe(0)
  })

  it("accepts a plain object of classifications as well as a Map", () => {
    const r = liveSubtotal(
      [{ product_id: "prod_fish", gross: 100, discounts: 0 }],
      { prod_fish: fish }
    )
    expect(r.liveSubtotal).toBe(100)
  })

  it("copes with an empty order", () => {
    expect(liveSubtotal([], classifications)).toEqual({
      liveSubtotal: 0,
      otherSubtotal: 0,
      hasLive: false,
    })
  })

  it("decides the reward boundary on live money only", () => {
    // $600 of salt plus $450 of fish must NOT qualify for a live-only reward.
    const r = liveSubtotal(
      [
        { product_id: "prod_salt", gross: 600, discounts: 0 },
        { product_id: "prod_fish", gross: 450, discounts: 0 },
      ],
      classifications
    )
    expect(r.liveSubtotal).toBe(450)
    expect(r.liveSubtotal > 500).toBe(false)
  })
})

describe("classification SQL", () => {
  it("emits one placeholder per product and never interpolates ids", () => {
    const sql = liveClassificationSql(3)
    expect(sql).toContain("id in (?,?,?)")
    expect(sql).toContain("p.deleted_at is null")
    expect(sql).not.toMatch(/prod_/)
  })

  it("shapes a raw row, reading the metadata override as a string", () => {
    expect(rowToClassification({ fse: "true", handles: ["fish"], tags: [] })).toEqual({
      metadata_override: true,
      category_handles: ["fish"],
      tag_values: [],
    })
    expect(rowToClassification({ fse: "false", handles: [], tags: [] }).metadata_override).toBe(false)
    expect(rowToClassification({ fse: null, handles: [], tags: [] }).metadata_override).toBeNull()
    expect(rowToClassification({}).category_handles).toEqual([])
  })
})
