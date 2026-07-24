import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import {
  decideImportAction,
  isMarkedForWebsite,
  resolveWebsiteCategoryFrom,
} from "../qbo-import"

const cats = (rows: Array<{ id: string; parent?: string }>) =>
  new Map(rows.map((r) => [r.id, { ParentRef: r.parent ? { value: r.parent } : null }]))

describe("resolveWebsiteCategoryFrom — never guess", () => {
  it("resolves exactly one category named Website (case-insensitive)", () => {
    const r = resolveWebsiteCategoryFrom(
      [
        { Id: "10", Name: "website" },
        { Id: "11", Name: "Frozen" },
      ],
      "Website"
    )
    expect(r).toEqual({ status: "ok", id: "10", name: "website" })
  })
  it("no Website category → missing (nothing is marked, nothing imports)", () => {
    expect(resolveWebsiteCategoryFrom([{ Id: "11", Name: "Frozen" }], "Website")).toEqual({ status: "missing" })
  })
  it("multiple categories named Website → ambiguous (manual review, no guessing)", () => {
    const r = resolveWebsiteCategoryFrom(
      [
        { Id: "10", Name: "Website" },
        { Id: "20", Name: "Website" },
      ],
      "Website"
    )
    expect(r).toEqual({ status: "ambiguous", ids: ["10", "20"] })
  })
})

describe("isMarkedForWebsite — structural ParentRef walk, never string prefixes", () => {
  it("direct child of Website → marked", () => {
    expect(
      isMarkedForWebsite({ Type: "Inventory", Active: true, ParentRef: { value: "10" } }, "10", cats([{ id: "10" }]))
    ).toBe(true)
  })
  it("child of a subcategory under Website → marked (chain walk)", () => {
    expect(
      isMarkedForWebsite(
        { Type: "Inventory", Active: true, ParentRef: { value: "30" } },
        "10",
        cats([{ id: "10" }, { id: "30", parent: "10" }])
      )
    ).toBe(true)
  })
  it("item under an unrelated category → not marked", () => {
    expect(
      isMarkedForWebsite(
        { Type: "Inventory", Active: true, ParentRef: { value: "40" } },
        "10",
        cats([{ id: "10" }, { id: "40" }])
      )
    ).toBe(false)
  })
  it("no parent at all (QuickBooks-only loose item) → not marked, untouched", () => {
    expect(isMarkedForWebsite({ Type: "Inventory", Active: true, ParentRef: null }, "10", cats([{ id: "10" }]))).toBe(false)
  })
  it("the Category record itself is NEVER importable, even under Website", () => {
    expect(
      isMarkedForWebsite({ Type: "Category", Active: true, ParentRef: { value: "10" } }, "10", cats([{ id: "10" }]))
    ).toBe(false)
  })
  it("inactive items are never marked", () => {
    expect(
      isMarkedForWebsite({ Type: "Inventory", Active: false, ParentRef: { value: "10" } }, "10", cats([{ id: "10" }]))
    ).toBe(false)
  })
})

describe("decideImportAction — link vs create vs review, no duplicates, no deletes", () => {
  const base = { isCategory: false, isActive: true, isMarked: true, hasSku: true, linkedVariantId: null as string | null, matchingVariantIds: [] as string[] }
  it("unmarked item → ignored (QuickBooks-only stays untouched)", () => {
    expect(decideImportAction({ ...base, isMarked: false }).action).toBe("ignore")
  })
  it("already mapped → already_linked (rerun/duplicate polls cannot duplicate)", () => {
    expect(decideImportAction({ ...base, linkedVariantId: "v1" })).toEqual({ action: "already_linked", variantId: "v1" })
  })
  it("exact single SKU/UPC match → link, never create", () => {
    expect(decideImportAction({ ...base, matchingVariantIds: ["v9"] })).toEqual({ action: "link", variantId: "v9" })
  })
  it("no match → create", () => {
    expect(decideImportAction(base)).toEqual({ action: "create" })
  })
  it("multiple variant matches → visible review", () => {
    expect(decideImportAction({ ...base, matchingVariantIds: ["v1", "v2"] }).action).toBe("review")
  })
  it("marked but missing SKU → visible review, no creation", () => {
    expect(decideImportAction({ ...base, hasSku: false }).action).toBe("review")
  })
  it("marker removal deletes nothing: previously-linked item without marker → ignore (mapping untouched)", () => {
    const d = decideImportAction({ ...base, isMarked: false, linkedVariantId: "v1" })
    expect(d.action).toBe("ignore") // not unlink, not delete, not hide
  })
})

describe("safety contracts in source", () => {
  it("the import module never deletes, hides, or unlinks Medusa products", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "qbo-import.ts"), "utf8")
    expect(src).not.toMatch(/deleteProduct/i)
    expect(src).not.toMatch(/updateProducts?\(/)
    expect(src).not.toMatch(/status:\s*"rejected"/)
    expect(src).toMatch(/status: "draft"/) // imports begin as drafts
  })
  it("FullyQualifiedName appears only in logging/diagnostics, never in decisions", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "qbo-import.ts"), "utf8")
    const decisionFns = src.split("export async function maybeImportMarkedItem")[0]
    expect(decisionFns).not.toMatch(/FullyQualifiedName/)
  })
})
