import { describe, it, expect } from "vitest"
import { reconcile, type ReconVariant, type ReconQboItem } from "../reconcile"

const v = (
  id: string,
  codes: { sku?: string | null; upc?: string | null; barcode?: string | null } = {}
): ReconVariant => ({
  variant_id: id,
  sku: codes.sku ?? null,
  upc: codes.upc ?? null,
  barcode: codes.barcode ?? null,
})

const q = (id: string, sku: string | null): ReconQboItem => ({ id, sku })

describe("reconcile — regression guards", () => {
  it("aborts with ZERO pairs when every identifier is blank (blank-read regression)", () => {
    const r = reconcile(
      [v("v1"), v("v2"), v("v3")],
      [q("1", "ws-a"), q("2", "ws-b")]
    )
    expect(r.abort).toMatch(/^G-BLANK/)
    expect(r.pairs).toHaveLength(0)
    expect(r.stats.noCode).toBe(3)
  })

  it("aborts with ZERO pairs when the QuickBooks list is empty", () => {
    const r = reconcile([v("v1", { sku: "WS-A" })], [])
    expect(r.abort).toMatch(/^G-EMPTYQBO/)
    expect(r.pairs).toHaveLength(0)
  })

  it("aborts when a duplicate SKU exists across QuickBooks items", () => {
    const r = reconcile(
      [v("v1", { sku: "WS-A" })],
      [q("1", "WS-A"), q("2", "WS-A")]
    )
    expect(r.abort).toMatch(/^G-DUPQBO/)
    expect(r.pairs).toHaveLength(0)
    expect(r.lists.ambiguousQboCodes[0].qboItemIds).toEqual(["1", "2"])
  })

  it("aborts when a duplicate UPC exists across store variants", () => {
    const r = reconcile(
      [v("v1", { upc: "012345678905" }), v("v2", { upc: "012345678905" })],
      [q("1", "012345678905")]
    )
    expect(r.abort).toMatch(/^G-DUPVAR/)
    expect(r.pairs).toHaveLength(0)
    expect(r.lists.duplicateVariantCodes[0].variantIds).toEqual(["v1", "v2"])
  })

  it("aborts when a variant's SKU and UPC resolve to DIFFERENT QuickBooks items", () => {
    const r = reconcile(
      [v("v1", { sku: "WS-A", upc: "012345678905" })],
      [q("1", "WS-A"), q("2", "012345678905")]
    )
    expect(r.abort).toMatch(/^G-CONFLICT/)
    expect(r.pairs).toHaveLength(0)
    expect(r.lists.conflicts[0].hits).toMatchObject({ sku: "1", upc: "2" })
  })

  it("aborts when pairing rate falls below 85% of code-bearing variants", () => {
    const variants = Array.from({ length: 10 }, (_, i) =>
      v(`v${i}`, { sku: `WS-${i}` })
    )
    // only 5 of 10 exist in QBO → 50% < 85%
    const items = Array.from({ length: 5 }, (_, i) => q(`${i}`, `WS-${i}`))
    const r = reconcile(variants, items)
    expect(r.abort).toMatch(/^G-RATE/)
    expect(r.pairs).toHaveLength(0) // callers write nothing on abort; engine emits pairs=...
  })

  it("aborts when pairing drops more than 5% below the last successful run", () => {
    const variants = Array.from({ length: 100 }, (_, i) =>
      v(`v${i}`, { sku: `WS-${i}` })
    )
    const items = Array.from({ length: 90 }, (_, i) => q(`${i}`, `WS-${i}`))
    const r = reconcile(variants, items, { baselinePaired: 100 })
    expect(r.abort).toMatch(/^G-BASELINE/)
  })
})

describe("reconcile — matching and normalization", () => {
  it("aborts on a BARCODE conflict with either other identifier (all pairs checked)", () => {
    const r = reconcile(
      [v("v1", { upc: "012345678905", barcode: "999999999999" })],
      [q("1", "012345678905"), q("2", "999999999999")]
    )
    expect(r.abort).toMatch(/^G-CONFLICT/)
    expect(r.pairs).toHaveLength(0)
    expect(r.lists.conflicts[0].hits).toMatchObject({ upc: "1", barcode: "2" })
  })

  it("aborts on a missing baseline when one is required (no silent fallback)", () => {
    const r = reconcile(
      [v("v1", { sku: "WS-A" })],
      [q("1", "WS-A")],
      { baselinePaired: null, requireBaseline: true }
    )
    expect(r.abort).toMatch(/^G-NOBASELINE/)
    expect(r.pairs).toHaveLength(0)
  })

  it("allows a declared initial run (requireBaseline false, baseline null)", () => {
    const r = reconcile(
      [v("v1", { sku: "WS-A" })],
      [q("1", "WS-A")],
      { baselinePaired: null, requireBaseline: false }
    )
    expect(r.abort).toBeNull()
    expect(r.pairs).toHaveLength(1)
  })

  it("reports ALL failed guards and makes the first in severity order authoritative", () => {
    // Trip G-DUPQBO AND G-RATE AND G-NOBASELINE simultaneously.
    const r = reconcile(
      [v("v1", { sku: "WS-DUP" }), v("v2", { sku: "WS-MISSING" })],
      [q("1", "WS-DUP"), q("2", "WS-DUP")],
      { baselinePaired: null, requireBaseline: true }
    )
    expect(r.failedGuards.length).toBeGreaterThanOrEqual(2)
    expect(r.abort).toMatch(/^G-DUPQBO/) // authoritative: earliest in fixed order
    expect(r.failedGuards[0]).toMatch(/^G-DUPQBO/)
    expect(r.failedGuards.some((g: string) => g.startsWith("G-NOBASELINE"))).toBe(true)
    expect(r.pairs).toHaveLength(0)
  })

  it("preserves leading zeros: 000116754101 matches only its exact string", () => {
    const r = reconcile(
      [v("v1", { upc: "000116754101" })],
      [q("1", "000116754101"), q("2", "116754101")]
    )
    expect(r.abort).toBeNull()
    expect(r.pairs).toEqual([{ variantId: "v1", qboItemId: "1", via: "upc" }])
  })

  it("does NOT match a zero-stripped code to a leading-zero code", () => {
    const r = reconcile([v("v1", { upc: "116754101" })], [q("1", "000116754101")])
    expect(r.pairs).toHaveLength(0)
    expect(r.lists.unmatchedVariants).toHaveLength(1)
  })

  it("matches case-insensitively and trims whitespace", () => {
    const r = reconcile(
      [v("v1", { sku: "  ws-yellow-tang  " })],
      [q("1", "WS-YELLOW-TANG")]
    )
    expect(r.abort).toBeNull()
    expect(r.pairs).toEqual([{ variantId: "v1", qboItemId: "1", via: "sku" }])
  })

  it("prefers UPC over SKU when both agree on the same item", () => {
    const r = reconcile(
      [v("v1", { sku: "WS-A", upc: "012345678905" })],
      [q("1", "012345678905"), q("2", "WS-B")]
    )
    expect(r.pairs).toEqual([{ variantId: "v1", qboItemId: "1", via: "upc" }])
    expect(r.abort).toBeNull()
  })

  it("lists unmatched code-bearing variants and untouched QuickBooks-only items", () => {
    const r = reconcile(
      [v("v1", { sku: "WS-A" }), v("v2", { sku: "WS-GONE" })],
      [q("1", "WS-A"), q("9", "water-by-gallon")]
    )
    expect(r.lists.unmatchedVariants.map((x) => x.variant_id)).toEqual(["v2"])
    expect(r.lists.unmatchedQboItems.map((x) => x.id)).toEqual(["9"])
    // 1/2 = 50% would trip G-RATE — that's correct behavior for this tiny set
    expect(r.abort).toMatch(/^G-RATE/)
  })

  it("no-code variants are counted, listed, and never matched", () => {
    const r = reconcile(
      [v("v1", { sku: "WS-A" }), v("v2")],
      [q("1", "WS-A")]
    )
    expect(r.stats.noCode).toBe(1)
    expect(r.lists.noCodeVariants[0].variant_id).toBe("v2")
    expect(r.pairs).toHaveLength(1)
    expect(r.abort).toBeNull()
  })

  it("happy path: full catalog pairs, no abort, stats add up", () => {
    const variants = [
      v("v1", { upc: "000000000017" }),
      v("v2", { sku: "WS-B" }),
      v("v3", { sku: "WS-C", upc: "000000000031" }),
    ]
    const items = [
      q("1", "000000000017"),
      q("2", "WS-B"),
      q("3", "000000000031"),
      q("owner", "water-by-gallon"),
    ]
    const r = reconcile(variants, items)
    expect(r.abort).toBeNull()
    expect(r.stats.paired).toBe(3)
    expect(r.stats.matchedByUpc).toBe(2)
    expect(r.stats.matchedBySku).toBe(1)
    expect(r.stats.unmatchedQboItems).toBe(1) // owner's item, untouched
  })
})
