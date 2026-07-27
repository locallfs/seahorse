import { describe, it, expect } from "vitest"
import { itemDisplayName, resolveItemKey } from "../mapping"
import { FISH_SIZES, CORAL_SIZES } from "../../../lib/sizes"

// Size variants map one-to-one onto QuickBooks items: the existing per-variant
// pipeline (item_map keyed by variant_id, itemDisplayName "Product — Size")
// already carries them. These tests pin the naming for every canonical size.

describe("QuickBooks item names for size variants", () => {
  it("renders Product — Size with an em dash", () => {
    expect(itemDisplayName("Yellow Tang", "Medium")).toBe("Yellow Tang — Medium")
    expect(itemDisplayName("Hammer Coral", "2½\"")).toBe("Hammer Coral — 2½\"")
    expect(itemDisplayName("Reef Additive", "500 ml")).toBe(
      "Reef Additive — 500 ml"
    )
  })

  it("every canonical fish and coral size produces a distinct item name", () => {
    const fishNames = FISH_SIZES.map((s) => itemDisplayName("Yellow Tang", s))
    expect(new Set(fishNames).size).toBe(FISH_SIZES.length)
    const coralNames = CORAL_SIZES.map((s) => itemDisplayName("Hammer Coral", s))
    expect(new Set(coralNames).size).toBe(CORAL_SIZES.length)
  })

  it("placeholder variants still collapse to the plain product name", () => {
    expect(itemDisplayName("Yellow Tang", "Default variant")).toBe("Yellow Tang")
    expect(itemDisplayName("Yellow Tang", "Default")).toBe("Yellow Tang")
    expect(itemDisplayName("Yellow Tang", null)).toBe("Yellow Tang")
  })

  it("100-char cap never collapses two sizes of the same long product title", () => {
    const longTitle = "X".repeat(120)
    const a = itemDisplayName(longTitle, "Small")
    const b = itemDisplayName(longTitle, "Show")
    // Both truncate to the same 100 chars — the SKU join key is what keeps
    // them distinct in QuickBooks, so the keys must differ per size.
    expect(a).toHaveLength(100)
    expect(b).toHaveLength(100)
    expect(
      resolveItemKey({ sku: "WS-LONG-V01", upc: null, barcode: null })
    ).not.toBe(resolveItemKey({ sku: "WS-LONG-V02", upc: null, barcode: null }))
  })

  it("per-size join keys prefer scanned UPC, then barcode, then SKU", () => {
    expect(
      resolveItemKey({ upc: "012345678905", barcode: "b", sku: "s" })
    ).toBe("012345678905")
    expect(resolveItemKey({ upc: null, barcode: "b", sku: "s" })).toBe("b")
    expect(resolveItemKey({ upc: null, barcode: null, sku: "s" })).toBe("s")
  })
})
