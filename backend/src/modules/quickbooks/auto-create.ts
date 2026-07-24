/* eslint-disable @typescript-eslint/no-explicit-any */
import type QuickbooksModuleService from "./service"
import {
  createInventoryItem,
  findItemBySku,
  type QboItem,
  type QboInventoryAccounts,
} from "./items"
import { itemDisplayName } from "./mapping"
import { qboQuery } from "./qbo-client"

// ---------------------------------------------------------------------------
// Automatic QuickBooks item creation for new store products.
//
// ACCOUNTING CONFIGURATION IS EXPLICIT — never "first available".
// The approved account IDs below were verified with the owner on 2026-07-24
// (income 67 "Billable Expense Income", asset 72 "Inventory Asset-1",
// cogs 36 "5000 COGS Merchandise") and match every existing synced item.
// The accountant can remap via env without a code change; a missing or
// blanked value FAILS VISIBLY instead of creating an item.
// ---------------------------------------------------------------------------
const APPROVED_ACCOUNTS = {
  income: "67",
  asset: "72",
  cogs: "36",
} as const

// The existing QuickBooks "Website" category (verified live 2026-07-24).
// New auto-created items are filed under it in the creation request itself.
// Env-overridable; a blanked value FAILS VISIBLY instead of creating an
// uncategorized item.
const APPROVED_WEBSITE_CATEGORY_ID = "2627"

export function resolveWebsiteCategoryId(
  env: Record<string, string | undefined> = process.env
): string {
  const id = env.QUICKBOOKS_WEBSITE_CATEGORY_ID ?? APPROVED_WEBSITE_CATEGORY_ID
  if (!id.trim()) {
    throw new MissingAccountingConfigError(
      "QuickBooks Website category id is blank — refusing to create an uncategorized item"
    )
  }
  return id.trim()
}

export class MissingAccountingConfigError extends Error {}

export function resolveConfiguredAccounts(
  env: Record<string, string | undefined> = process.env
): QboInventoryAccounts {
  const income = env.QUICKBOOKS_INCOME_ACCOUNT_ID ?? APPROVED_ACCOUNTS.income
  const asset = env.QUICKBOOKS_ASSET_ACCOUNT_ID ?? APPROVED_ACCOUNTS.asset
  const cogs = env.QUICKBOOKS_COGS_ACCOUNT_ID ?? APPROVED_ACCOUNTS.cogs
  if (!income.trim() || !asset.trim() || !cogs.trim()) {
    throw new MissingAccountingConfigError(
      "QuickBooks accounting configuration missing (income/asset/COGS account id) — refusing to create items"
    )
  }
  return {
    incomeAccountId: income.trim(),
    assetAccountId: asset.trim(),
    cogsAccountId: cogs.trim(),
  }
}

// Exact-name lookup used ONLY as duplicate PROTECTION before creating.
// It never links a store product to a QuickBooks item (name-matching for
// linking remains banned).
export async function findActiveItemsByExactName(
  qb: QuickbooksModuleService,
  name: string
): Promise<QboItem[]> {
  const escaped = name.replace(/'/g, "''")
  const res = await qboQuery<{ QueryResponse: { Item?: QboItem[] } }>(
    qb,
    `select * from Item where Name = '${escaped}' and Active = true maxresults 5`
  )
  return res.QueryResponse?.Item ?? []
}

// -------- pure decision core (unit-tested) --------
export type NewItemDecision =
  | { action: "ledger" }
  | { action: "adopt"; qboItemId: string }
  | { action: "create" }
  | { action: "review"; reason: string }

export function decideNewItemAction(input: {
  hasLedgerMapping: boolean
  codeHits: string[] // QBO item ids found via the variant's own codes
  nameHits: string[] // QBO item ids sharing the exact display name
}): NewItemDecision {
  if (input.hasLedgerMapping) return { action: "ledger" }
  const distinct = [...new Set(input.codeHits)]
  if (distinct.length === 1) {
    const only = distinct[0]
    if (input.nameHits.every((id) => id === only)) {
      return { action: "adopt", qboItemId: only }
    }
    return {
      action: "review",
      reason: `code matches item ${only} but the name also exists on ${input.nameHits.filter((i) => i !== only).join(",")}`,
    }
  }
  if (distinct.length > 1) {
    return {
      action: "review",
      reason: `codes match multiple QuickBooks items: ${distinct.join(",")}`,
    }
  }
  if (input.nameHits.length > 0) {
    return {
      action: "review",
      reason: `no code match, but the name already exists on QuickBooks item(s) ${input.nameHits.join(",")} — will not link by name and will not create a duplicate name`,
    }
  }
  return { action: "create" }
}

// Visible alert: red row in the activity log AND the red banner on the admin
// QuickBooks page (connection.last_error). Not just a quiet review line.
export async function alertVisible(
  qb: QuickbooksModuleService,
  sku: string | null,
  message: string
): Promise<void> {
  await qb
    .logSync({
      direction: "medusa_to_qbo",
      entityType: "auto-create",
      sku,
      status: "failed",
      errorMessage: message,
    })
    .catch(() => {})
  await qb.recordError(message).catch(() => {})
}

export type EnsureOutcome =
  | { outcome: "ledger"; qboItemId: string }
  | { outcome: "adopted"; qboItemId: string }
  | { outcome: "created"; qboItemId: string; initialQty: number }
  | { outcome: "created_unmapped"; qboItemId: string } // partial failure — alerted
  | { outcome: "review"; reason: string }
  | { outcome: "config_error"; reason: string }

export type EnsureDeps = {
  categoryId: () => string
  ledgerLookup: (variantId: string) => Promise<string | null>
  codeLookup: (code: string) => Promise<QboItem | null>
  nameLookup: (name: string) => Promise<QboItem[]>
  qtyPrice: (variantId: string) => Promise<{ qty: number; price: number | null; description: string | null }>
  accounts: () => QboInventoryAccounts
  create: (params: Parameters<typeof createInventoryItem>[1]) => Promise<QboItem>
  mapWrite: (variantId: string, qboItemId: string) => Promise<void>
  alert: (sku: string | null, message: string) => Promise<void>
}

// One controlled workflow: decide → create item (with initial qty) → write
// permanent ledger mapping. Exactly-once: reruns and duplicate events land on
// "ledger" or "adopt" and can never create a second item.
export async function ensureQboItemForVariant(
  variant: {
    variant_id: string
    product_title: string
    variant_title?: string | null
    sku: string | null
    upc: string | null
    barcode: string | null
  },
  deps: EnsureDeps
): Promise<EnsureOutcome> {
  const key = (variant.upc || variant.barcode || variant.sku || "").trim()
  const name = itemDisplayName(variant.product_title, variant.variant_title)

  const mapped = await deps.ledgerLookup(variant.variant_id)
  if (mapped) return { outcome: "ledger", qboItemId: mapped }

  const codeHits: string[] = []
  for (const code of [variant.upc, variant.barcode, variant.sku]) {
    const c = (code || "").trim()
    if (!c) continue
    const hit = await deps.codeLookup(c)
    if (hit) codeHits.push(String(hit.Id))
  }
  const nameHits = (await deps.nameLookup(name)).map((i) => String(i.Id))

  const decision = decideNewItemAction({
    hasLedgerMapping: false,
    codeHits,
    nameHits,
  })
  if (decision.action === "ledger") return { outcome: "ledger", qboItemId: "" }
  if (decision.action === "adopt") {
    await deps.mapWrite(variant.variant_id, decision.qboItemId)
    return { outcome: "adopted", qboItemId: decision.qboItemId }
  }
  if (decision.action === "review") {
    await deps.alert(
      key || null,
      `AUTO-CREATE NEEDS REVIEW for "${name}": ${decision.reason}`
    )
    return { outcome: "review", reason: decision.reason }
  }

  // action === "create"
  let accounts: QboInventoryAccounts
  let categoryId: string
  try {
    accounts = deps.accounts()
    categoryId = deps.categoryId()
  } catch (e: any) {
    await deps.alert(key || null, `AUTO-CREATE BLOCKED for "${name}": ${e?.message}`)
    return { outcome: "config_error", reason: String(e?.message || e) }
  }
  if (!key) {
    return { outcome: "review", reason: "variant has no identifying code" }
  }
  const { qty, price, description } = await deps.qtyPrice(variant.variant_id)
  const item = await deps.create({
    name,
    sku: key,
    qtyOnHand: qty,
    unitPrice: price ?? undefined,
    description: description ?? undefined,
    accounts,
    invStartDate: new Date().toISOString().slice(0, 10),
    parentCategoryId: categoryId,
  })
  // Confirm the created item actually carries the category. If QuickBooks
  // silently dropped it, the item still exists — map it, but raise a visible
  // alert so it cannot pass as fully synced.
  const createdParent = String((item as any).ParentRef?.value ?? "")
  if (createdParent !== categoryId) {
    await deps.alert(
      key,
      `AUTO-CREATE WARNING for "${name}": QuickBooks item ${item.Id} was created but is NOT under the Website category (got "${createdParent || "none"}", expected ${categoryId})`
    )
  }
  try {
    await deps.mapWrite(variant.variant_id, String(item.Id))
  } catch (e: any) {
    // Partial failure must be unmistakable: the QuickBooks item EXISTS but
    // the sync is NOT complete until the ledger row lands.
    await deps.alert(
      key,
      `PARTIAL SYNC for "${name}": QuickBooks item ${item.Id} was created but the ledger mapping write FAILED (${String(e?.message || e).slice(0, 120)}). A rerun will adopt it by code.`
    )
    return { outcome: "created_unmapped", qboItemId: String(item.Id) }
  }
  return { outcome: "created", qboItemId: String(item.Id), initialQty: qty }
}

// Production wiring for the subscriber path.
export function defaultEnsureDeps(
  qb: QuickbooksModuleService,
  pg: any
): EnsureDeps {
  return {
    ledgerLookup: (variantId) => qb.qboItemIdForVariant(variantId),
    codeLookup: (code) => findItemBySku(qb, code),
    nameLookup: (name) => findActiveItemsByExactName(qb, name),
    qtyPrice: async (variantId) => {
      const res = await pg.raw(
        `select
           coalesce((select sum(il.stocked_quantity)
              from product_variant_inventory_item l
              join inventory_level il on il.inventory_item_id = l.inventory_item_id
               and il.deleted_at is null
             where l.variant_id = ? and l.deleted_at is null), 0) as qty,
           (select pr.amount from product_variant_price_set pvps
              join price pr on pr.price_set_id = pvps.price_set_id
               and pr.deleted_at is null and pr.currency_code = 'usd'
               and pr.price_list_id is null
             where pvps.variant_id = ? and pvps.deleted_at is null limit 1) as price,
           (select p.description from product_variant pv join product p on p.id = pv.product_id
             where pv.id = ? limit 1) as description`,
        [variantId, variantId, variantId]
      )
      const row = res?.rows?.[0] ?? {}
      return {
        qty: Math.max(0, Math.floor(Number(row.qty ?? 0))),
        price: row.price == null ? null : Number(row.price),
        description: row.description ?? null,
      }
    },
    accounts: () => resolveConfiguredAccounts(),
    categoryId: () => resolveWebsiteCategoryId(),
    create: (params) => createInventoryItem(qb, params),
    mapWrite: (variantId, qboItemId) => qb.mapVariantToQboItem(variantId, qboItemId),
    alert: (sku, message) => alertVisible(qb, sku, message),
  }
}
