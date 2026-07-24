import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import {
  QB_DESCRIPTION_MAX,
  decideQboDescriptionImport,
  qbDescriptionForPayload,
  sanitizeQbDescription,
} from "../qb-description"
import { ensureQboItemForVariant, type EnsureDeps } from "../auto-create"

const read = (...p: string[]) =>
  fs.readFileSync(path.join(__dirname, "..", ...p), "utf8")

const variant = {
  variant_id: "v1",
  product_title: "Flame Angelfish",
  variant_title: "Default variant",
  sku: "WS-FLAME-ANGELFISH",
  upc: null,
  barcode: null,
}

const makeDeps = (qbDescription: string | null): EnsureDeps & { created: any[] } => {
  const created: any[] = []
  return {
    created,
    categoryId: () => "2627",
    ledgerLookup: async () => null,
    codeLookup: async () => null,
    nameLookup: async () => [],
    qtyPrice: async () => ({ qty: 3, price: 135, description: qbDescription }),
    accounts: () => ({ incomeAccountId: "67", assetAccountId: "72", cogsAccountId: "36" }),
    create: async (p: any) => {
      created.push(p)
      return {
        Id: "9001",
        Name: p.name,
        Type: "Inventory",
        SyncToken: "0",
        SubItem: true,
        ParentRef: { value: p.parentCategoryId },
      } as any
    },
    mapWrite: async () => {},
    alert: async () => {},
  } as any
}

describe("sanitizeQbDescription — short, plain text, single line", () => {
  it("strips HTML and collapses newlines to a single line", () => {
    expect(sanitizeQbDescription("<p>Captive-bred</p>\nreef\r\nsafe")).toBe(
      "Captive-bred reef safe"
    )
  })
  it("caps at ~120 characters", () => {
    expect(sanitizeQbDescription("x".repeat(500)).length).toBe(QB_DESCRIPTION_MAX)
  })
  it("blank/non-string input is blank", () => {
    expect(sanitizeQbDescription("   ")).toBe("")
    expect(sanitizeQbDescription(undefined)).toBe("")
    expect(sanitizeQbDescription(42 as any)).toBe("")
  })
})

describe("the Website Description NEVER enters a QuickBooks payload", () => {
  it("auto-create reads only metadata.quickbooks_description — not product.description", () => {
    const src = read("auto-create.ts")
    expect(src).not.toMatch(/p\.description/)
    expect(src).toMatch(/quickbooks_description/)
  })
  it("catalog reads for the resync carry only the QuickBooks description", () => {
    const src = read("db-reads.ts")
    expect(src).not.toMatch(/p\.description/)
    expect(src).toMatch(/metadata->>'quickbooks_description'/)
  })
  it("the resync passes only qb_description into item creation", () => {
    const src = read("seed-core.ts")
    expect(src).not.toMatch(/row\.description/)
    expect(src).toMatch(/qb_description/)
  })
  it("payload builder: website content is not a fallback — blank means OMITTED", () => {
    expect(qbDescriptionForPayload({})).toBeUndefined()
    expect(qbDescriptionForPayload(null)).toBeUndefined()
    expect(qbDescriptionForPayload({ quickbooks_description: "  " })).toBeUndefined()
    expect(
      qbDescriptionForPayload({ quickbooks_description: "Reef safe" })
    ).toBe("Reef safe")
  })
})

describe("blank QuickBooks Description stays blank in QuickBooks", () => {
  it("item creation carries NO description when the field is blank", async () => {
    const deps = makeDeps(null)
    const r = await ensureQboItemForVariant(variant, deps)
    expect(r.outcome).toBe("created")
    expect(deps.created[0].description).toBeUndefined()
  })
  it("item creation carries the QuickBooks Description when set", async () => {
    const deps = makeDeps("Captive-bred pair")
    await ensureQboItemForVariant(variant, deps)
    expect(deps.created[0].description).toBe("Captive-bred pair")
  })
})

describe("QuickBooks → Medusa descriptions go ONLY into the separate field", () => {
  it("import decision writes only non-blank, changed values", () => {
    expect(decideQboDescriptionImport("Frozen mysis 4oz", "")).toEqual({
      write: true,
      value: "Frozen mysis 4oz",
    })
    expect(decideQboDescriptionImport("Same", "Same")).toEqual({ write: false })
  })
  it("a BLANK QuickBooks description never erases anything", () => {
    expect(decideQboDescriptionImport("", "Staff wrote this")).toEqual({
      write: false,
    })
    expect(decideQboDescriptionImport(undefined, "Staff wrote this")).toEqual({
      write: false,
    })
  })
  it("the applier writes metadata.quickbooks_description and can never touch the website description", () => {
    const src = read("apply-item.ts")
    expect(src).toMatch(/quickbooks_description/)
    // The only product-table write is the metadata merge:
    expect(src).toMatch(/set metadata = coalesce\(metadata/)
    expect(src).not.toMatch(/set\s+description/i)
    expect(src).not.toMatch(/p\.description\b/)
  })
  it("the website importer stores the QBO description as metadata, never as the product description", () => {
    const src = read("qbo-import.ts")
    expect(src).toMatch(/QB_DESCRIPTION_METADATA_KEY/)
    // No `description:` property anywhere in the product-create input.
    expect(src).not.toMatch(/^\s*description:/m)
  })
})
