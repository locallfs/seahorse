import { describe, it, expect, vi } from "vitest"
import fs from "node:fs"
import path from "node:path"
import {
  decideNewItemAction,
  resolveConfiguredAccounts,
  ensureQboItemForVariant,
  MissingAccountingConfigError,
  type EnsureDeps,
} from "../auto-create"

const variant = {
  variant_id: "v1",
  product_title: "Flame Angelfish",
  variant_title: "Default variant",
  sku: "WS-FLAME-ANGELFISH",
  upc: null,
  barcode: null,
}

const makeDeps = (over: Partial<EnsureDeps> = {}): EnsureDeps & {
  created: any[]
  mapped: any[]
  alerts: any[]
} => {
  const created: any[] = []
  const mapped: any[] = []
  const alerts: any[] = []
  return {
    created,
    mapped,
    alerts,
    ledgerLookup: async () => null,
    codeLookup: async () => null,
    nameLookup: async () => [],
    qtyPrice: async () => ({ qty: 3, price: 135, description: "a fish" }),
    accounts: () => ({ incomeAccountId: "67", assetAccountId: "72", cogsAccountId: "36" }),
    create: async (p: any) => {
      created.push(p)
      return { Id: "9001", Name: p.name, Type: "Inventory", SyncToken: "0" } as any
    },
    mapWrite: async (variantId: string, qboItemId: string) => {
      mapped.push({ variantId, qboItemId })
    },
    alert: async (sku: string | null, message: string) => {
      alerts.push({ sku, message })
    },
    ...over,
  }
}

describe("decideNewItemAction — duplicate protection & linking rules", () => {
  it("no hits anywhere → create", () => {
    expect(decideNewItemAction({ hasLedgerMapping: false, codeHits: [], nameHits: [] })).toEqual({ action: "create" })
  })
  it("existing ledger mapping → ledger (duplicate events cannot re-create)", () => {
    expect(decideNewItemAction({ hasLedgerMapping: true, codeHits: [], nameHits: [] })).toEqual({ action: "ledger" })
  })
  it("single code hit with agreeing name → adopt (retries cannot duplicate)", () => {
    expect(decideNewItemAction({ hasLedgerMapping: false, codeHits: ["55"], nameHits: ["55"] })).toEqual({ action: "adopt", qboItemId: "55" })
  })
  it("name-only hit → review; never links by name, never creates a duplicate name", () => {
    const d = decideNewItemAction({ hasLedgerMapping: false, codeHits: [], nameHits: ["77"] })
    expect(d.action).toBe("review")
  })
  it("conflicting code hits → review, no creation", () => {
    const d = decideNewItemAction({ hasLedgerMapping: false, codeHits: ["1", "2"], nameHits: [] })
    expect(d.action).toBe("review")
  })
  it("code hit disagreeing with a name hit → review", () => {
    const d = decideNewItemAction({ hasLedgerMapping: false, codeHits: ["1"], nameHits: ["2"] })
    expect(d.action).toBe("review")
  })
})

describe("resolveConfiguredAccounts — explicit, never first-available", () => {
  it("uses the approved account IDs by default (67/72/36)", () => {
    expect(resolveConfiguredAccounts({})).toEqual({ incomeAccountId: "67", assetAccountId: "72", cogsAccountId: "36" })
  })
  it("respects explicit env overrides verbatim", () => {
    expect(
      resolveConfiguredAccounts({
        QUICKBOOKS_INCOME_ACCOUNT_ID: "100",
        QUICKBOOKS_ASSET_ACCOUNT_ID: "200",
        QUICKBOOKS_COGS_ACCOUNT_ID: "300",
      })
    ).toEqual({ incomeAccountId: "100", assetAccountId: "200", cogsAccountId: "300" })
  })
  it("fails visibly when configuration is blanked — no silent fallback", () => {
    expect(() => resolveConfiguredAccounts({ QUICKBOOKS_INCOME_ACCOUNT_ID: "  " })).toThrow(MissingAccountingConfigError)
  })
})

describe("ensureQboItemForVariant — exactly-once workflow", () => {
  it("new product: creates exactly one item, writes the ledger mapping, seeds initial qty", async () => {
    const deps = makeDeps()
    const r = await ensureQboItemForVariant(variant, deps)
    expect(r).toEqual({ outcome: "created", qboItemId: "9001", initialQty: 3 })
    expect(deps.created).toHaveLength(1)
    expect(deps.created[0]).toMatchObject({ name: "Flame Angelfish", sku: "WS-FLAME-ANGELFISH", qtyOnHand: 3, unitPrice: 135 })
    expect(deps.mapped).toEqual([{ variantId: "v1", qboItemId: "9001" }])
  })
  it("second event after mapping: zero creations (exactly once)", async () => {
    const deps = makeDeps({ ledgerLookup: async () => "9001" })
    const r = await ensureQboItemForVariant(variant, deps)
    expect(r).toEqual({ outcome: "ledger", qboItemId: "9001" })
    expect(deps.created).toHaveLength(0)
    expect(deps.mapped).toHaveLength(0)
  })
  it("retry after create-but-unmapped: adopts by code, zero new creations", async () => {
    const deps = makeDeps({
      codeLookup: async (code) => (code === "WS-FLAME-ANGELFISH" ? ({ Id: "9001", Name: "Flame Angelfish", Type: "Inventory", SyncToken: "0" } as any) : null),
    })
    const r = await ensureQboItemForVariant(variant, deps)
    expect(r).toEqual({ outcome: "adopted", qboItemId: "9001" })
    expect(deps.created).toHaveLength(0)
    expect(deps.mapped).toEqual([{ variantId: "v1", qboItemId: "9001" }])
  })
  it("ambiguity: alerts visibly and creates nothing", async () => {
    const deps = makeDeps({ nameLookup: async () => [{ Id: "77", Name: "Flame Angelfish", Type: "Inventory", SyncToken: "0" } as any] })
    const r = await ensureQboItemForVariant(variant, deps)
    expect(r.outcome).toBe("review")
    expect(deps.created).toHaveLength(0)
    expect(deps.alerts).toHaveLength(1)
    expect(deps.alerts[0].message).toMatch(/NEEDS REVIEW/)
  })
  it("missing accounting config: fails visibly, creates nothing", async () => {
    const deps = makeDeps({
      accounts: () => {
        throw new MissingAccountingConfigError("QuickBooks accounting configuration missing")
      },
    })
    const r = await ensureQboItemForVariant(variant, deps)
    expect(r.outcome).toBe("config_error")
    expect(deps.created).toHaveLength(0)
    expect(deps.alerts).toHaveLength(1)
    expect(deps.alerts[0].message).toMatch(/BLOCKED/)
  })
  it("partial failure (item created, ledger write fails) is loudly distinct from success", async () => {
    const deps = makeDeps({
      mapWrite: async () => {
        throw new Error("db down")
      },
    })
    const r = await ensureQboItemForVariant(variant, deps)
    expect(r.outcome).toBe("created_unmapped")
    expect(deps.alerts).toHaveLength(1)
    expect(deps.alerts[0].message).toMatch(/PARTIAL SYNC/)
    expect(deps.alerts[0].message).toMatch(/mapping write FAILED/)
  })
})

describe("QuickBooks-only items are never imported into Medusa", () => {
  it("the QBO→store applier contains no product- or item-creation call", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "apply-item.ts"), "utf8")
    expect(src).not.toMatch(/createProduct/i)
    expect(src).not.toMatch(/createInventoryItem/)
    expect(src).not.toMatch(/ensureQboItemForVariant/)
    // Unmatched QBO items are ignored by design:
    expect(src).toMatch(/silently ignore/)
  })
  it("auto-create runs only in the store→QBO direction (subscriber), never in the applier or webhook", () => {
    const applier = fs.readFileSync(path.join(__dirname, "..", "apply-item.ts"), "utf8")
    const webhook = fs.readFileSync(
      path.join(__dirname, "..", "..", "..", "api", "webhooks", "quickbooks", "route.ts"),
      "utf8"
    )
    expect(applier).not.toMatch(/auto-create/)
    expect(webhook).not.toMatch(/auto-create/)
  })
})
