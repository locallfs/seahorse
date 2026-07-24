import { describe, it, expect } from "vitest"
import {
  APPROVED_MEDUSA_CLEAR_SQL,
  assertMedusaClearWrite,
  assertQboClearPayload,
  buildClearDescriptionPayload,
  decideClearAction,
  decideMedusaClear,
  isDescriptionCleared,
} from "../clear-descriptions"

describe("one-time description cleanup — scope", () => {
  it("touches ONLY mapped website products", () => {
    expect(
      decideClearAction({ isMapped: true, itemFound: true, active: true, description: "old website copy" })
    ).toEqual({ action: "clear" })
  })
  it("QuickBooks-only local items (fees, water, frozen, services) are untouched", () => {
    expect(
      decideClearAction({ isMapped: false, itemFound: true, active: true, description: "Delivery fee" })
    ).toEqual({ action: "skip_unmapped" })
  })
  it("mapped-but-inactive and missing items are skipped, not modified", () => {
    expect(
      decideClearAction({ isMapped: true, itemFound: true, active: false, description: "x" })
    ).toEqual({ action: "skip_inactive" })
    expect(decideClearAction({ isMapped: true, itemFound: false })).toEqual({
      action: "skip_missing",
    })
  })
})

describe("one-time description cleanup — idempotence", () => {
  it("already-blank descriptions are a no-op (what a rerun hits)", () => {
    expect(
      decideClearAction({ isMapped: true, itemFound: true, active: true, description: "" })
    ).toEqual({ action: "already_blank" })
    expect(
      decideClearAction({ isMapped: true, itemFound: true, active: true, description: "   " })
    ).toEqual({ action: "already_blank" })
    expect(
      decideClearAction({ isMapped: true, itemFound: true, active: true, description: null })
    ).toEqual({ action: "already_blank" })
  })
})

describe("one-time description cleanup — nothing else can change", () => {
  it("the payload carries EXACTLY Id, SyncToken, sparse, and a blank Description", () => {
    const p = buildClearDescriptionPayload({ Id: "123", SyncToken: "4" })
    expect(p).toEqual({ Id: "123", SyncToken: "4", sparse: true, Description: "" })
    // Names, quantities, prices, accounts, tax settings, categories, and the
    // permanent mapping are untouchable by construction:
    expect(Object.keys(p).sort()).toEqual(["Description", "Id", "SyncToken", "sparse"])
  })
  it("verification: the update response must actually show a blank description", () => {
    expect(isDescriptionCleared({})).toBe(true)
    expect(isDescriptionCleared({ Description: "" })).toBe(true)
    expect(isDescriptionCleared({ Description: "still here" })).toBe(false)
  })
})

describe("execution-time write assertions — the hard guarantee", () => {
  it("accepts exactly the approved QuickBooks payload", () => {
    expect(() =>
      assertQboClearPayload(buildClearDescriptionPayload({ Id: "1", SyncToken: "0" }))
    ).not.toThrow()
  })
  it("rejects any extra QuickBooks field (Name, price, qty, tax, accounts, category, active)", () => {
    for (const extra of [
      { Name: "x" },
      { UnitPrice: 5 },
      { QtyOnHand: 3 },
      { Taxable: false },
      { IncomeAccountRef: { value: "67" } },
      { ParentRef: { value: "2627" } },
      { Active: false },
      { Sku: "WS-X" },
      { PurchaseDesc: "" },
    ]) {
      expect(() =>
        assertQboClearPayload({ Id: "1", SyncToken: "0", sparse: true, Description: "", ...extra })
      ).toThrow(/WRITE ASSERTION FAILED/)
    }
  })
  it("rejects a non-blank Description and a non-sparse update", () => {
    expect(() =>
      assertQboClearPayload({ Id: "1", SyncToken: "0", sparse: true, Description: "text" })
    ).toThrow(/WRITE ASSERTION FAILED/)
    expect(() =>
      assertQboClearPayload({ Id: "1", SyncToken: "0", sparse: false, Description: "" })
    ).toThrow(/WRITE ASSERTION FAILED/)
  })
  it("accepts exactly the approved Medusa statement with one product id", () => {
    expect(() =>
      assertMedusaClearWrite(APPROVED_MEDUSA_CLEAR_SQL, ["prod_1"])
    ).not.toThrow()
  })
  it("rejects ANY other Medusa statement — including ones touching description, title, subtitle, handle, variants, images, tags, categories, prices, inventory, or mappings", () => {
    const bad = [
      "update product set description = '' where id = $1",
      "update product set title = 'x' where id = $1",
      "update product set subtitle = null where id = $1",
      "update product set handle = 'y' where id = $1",
      "update product set metadata = '{}'::jsonb where id = $1", // wholesale metadata replace: not the approved merge
      APPROVED_MEDUSA_CLEAR_SQL + " ", // even a one-byte deviation
      "update product_variant set sku = null where id = $1",
      "update price set amount = 0 where id = $1",
      "update inventory_level set stocked_quantity = 0 where id = $1",
      "update quickbooks_item_map set deleted_at = now() where variant_id = $1",
    ]
    for (const sql of bad) {
      expect(() => assertMedusaClearWrite(sql, ["prod_1"])).toThrow(
        /WRITE ASSERTION FAILED/
      )
    }
  })
  it("rejects wrong parameters (must be exactly one product id)", () => {
    expect(() => assertMedusaClearWrite(APPROVED_MEDUSA_CLEAR_SQL, [])).toThrow()
    expect(() =>
      assertMedusaClearWrite(APPROVED_MEDUSA_CLEAR_SQL, ["a", "b"])
    ).toThrow()
  })
  it("the approved statement itself touches ONLY the quickbooks_description metadata key", () => {
    // Strip the permitted key; no field-like token may remain.
    const residual = APPROVED_MEDUSA_CLEAR_SQL.replace(/quickbooks_description/g, "")
    for (const tok of ["description", "subtitle", "title", "handle", "variant", "image", "tag", "categor", "price", "inventory", "map"]) {
      expect(residual.toLowerCase()).not.toContain(tok)
    }
  })
  it("Medusa-side decision: only non-blank values are written; blank/absent is a rerun no-op", () => {
    expect(decideMedusaClear("old copy")).toBe("clear")
    expect(decideMedusaClear("")).toBe("already_blank")
    expect(decideMedusaClear("   ")).toBe("already_blank")
    expect(decideMedusaClear(null)).toBe("already_blank")
    expect(decideMedusaClear(undefined)).toBe("already_blank")
  })
})
