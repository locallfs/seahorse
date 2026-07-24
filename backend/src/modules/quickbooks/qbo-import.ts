/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContainerRegistrationKeys, Modules } from "@medusajs/utils"
import { createProductsWorkflow } from "@medusajs/core-flows"
import type QuickbooksModuleService from "./service"
import { getItemById, type QboItem } from "./items"
import { qboQuery } from "./qbo-client"
import { alertVisible } from "./auto-create"
import {
  QB_DESCRIPTION_METADATA_KEY,
  sanitizeQbDescription,
} from "./qb-description"

// ---------------------------------------------------------------------------
// QuickBooks → Medusa inclusion ("publish/sync to website").
//
// MARKER: the QuickBooks item Category named `Website` (env-configurable via
// QUICKBOOKS_WEBSITE_CATEGORY). Detection is STRUCTURAL: we resolve the
// category item's QuickBooks ID and walk each item's ParentRef chain — an
// item is marked when the chain reaches the Website category (directly or
// through subcategories). The display path string is used for logging ONLY.
//
// Rules (owner-approved):
// - the Category record itself is never imported
// - the item must be Active
// - multiple categories named Website → manual review, never guess
// - unmarked QuickBooks-only items are untouched
// - removing the marker deletes/hides/unlinks NOTHING (mapping persists)
// - exact SKU/UPC match to an existing variant → LINK; none → CREATE (draft);
//   conflicts / missing SKU → visible manual review
// ---------------------------------------------------------------------------

const WEBSITE_CATEGORY = () =>
  (process.env.QUICKBOOKS_WEBSITE_CATEGORY || "Website").trim()

export type CategoryResolution =
  | { status: "ok"; id: string; name: string }
  | { status: "missing" }
  | { status: "ambiguous"; ids: string[] }

// Pure: pick the Website category from the full Category-item list.
export function resolveWebsiteCategoryFrom(
  categories: Array<{ Id: string; Name: string }>,
  configuredName: string
): CategoryResolution {
  const matches = categories.filter(
    (c) => (c.Name || "").trim().toLowerCase() === configuredName.toLowerCase()
  )
  if (matches.length === 0) return { status: "missing" }
  if (matches.length > 1)
    return { status: "ambiguous", ids: matches.map((m) => String(m.Id)) }
  return { status: "ok", id: String(matches[0].Id), name: matches[0].Name }
}

// Pure: structural ParentRef-chain walk (subcategories supported, depth-capped).
export function isMarkedForWebsite(
  item: {
    Type?: string
    Active?: boolean
    ParentRef?: { value?: string } | null
  },
  websiteCategoryId: string,
  categoriesById: Map<string, { ParentRef?: { value?: string } | null }>
): boolean {
  if (item.Type === "Category") return false // never import the category itself
  if (item.Active === false) return false
  let parent = item.ParentRef?.value ? String(item.ParentRef.value) : null
  for (let depth = 0; parent && depth < 10; depth++) {
    if (parent === websiteCategoryId) return true
    const next = categoriesById.get(parent)?.ParentRef?.value
    parent = next ? String(next) : null
  }
  return false
}

export type ImportAction =
  | { action: "ignore"; reason: string }
  | { action: "already_linked"; variantId: string }
  | { action: "link"; variantId: string }
  | { action: "create" }
  | { action: "review"; reason: string }

// Pure decision core (unit-tested).
export function decideImportAction(input: {
  isCategory: boolean
  isActive: boolean
  isMarked: boolean
  hasSku: boolean
  linkedVariantId: string | null
  matchingVariantIds: string[]
}): ImportAction {
  if (input.isCategory) return { action: "ignore", reason: "category record" }
  if (!input.isActive) return { action: "ignore", reason: "inactive" }
  if (!input.isMarked)
    return { action: "ignore", reason: "not marked for website" }
  if (input.linkedVariantId)
    return { action: "already_linked", variantId: input.linkedVariantId }
  if (!input.hasSku)
    return {
      action: "review",
      reason: "marked for website but has no SKU/UPC to import under",
    }
  if (input.matchingVariantIds.length === 1)
    return { action: "link", variantId: input.matchingVariantIds[0] }
  if (input.matchingVariantIds.length > 1)
    return {
      action: "review",
      reason: `SKU matches multiple store variants: ${input.matchingVariantIds.join(",")}`,
    }
  return { action: "create" }
}

// Fetches all Category-type items (for resolution + chain walking).
async function fetchCategories(qb: QuickbooksModuleService): Promise<QboItem[]> {
  const res = await qboQuery<{ QueryResponse: { Item?: QboItem[] } }>(
    qb,
    `select * from Item where Type = 'Category' and Active = true maxresults 1000`
  )
  return res.QueryResponse?.Item ?? []
}

let ambiguityAlertedThisBoot = false

// Entry point used by BOTH the webhook (instant path) and the CDC sweep
// (catch-up with overlapping lookback + dedupe): checks one changed item for
// website inclusion and links/creates/reviews accordingly.
export async function maybeImportMarkedItem(
  qb: QuickbooksModuleService,
  container: { resolve: (k: string) => any },
  qboItemId: string
): Promise<void> {
  if (process.env.QUICKBOOKS_SYNC_ENABLED !== "true") return
  const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const item = await getItemById(qb, qboItemId)
  if (!item) return

  const categories = await fetchCategories(qb)
  const resolution = resolveWebsiteCategoryFrom(
    categories.map((c) => ({ Id: String(c.Id), Name: c.Name })),
    WEBSITE_CATEGORY()
  )
  if (resolution.status === "missing") return // no Website category yet — nothing is marked
  if (resolution.status === "ambiguous") {
    if (!ambiguityAlertedThisBoot) {
      ambiguityAlertedThisBoot = true
      await alertVisible(
        qb,
        null,
        `WEBSITE IMPORT NEEDS REVIEW: ${resolution.ids.length} QuickBooks categories are named "${WEBSITE_CATEGORY()}" (ids ${resolution.ids.join(", ")}). Refusing to guess — rename or merge them.`
      )
    }
    return
  }

  const categoriesById = new Map(
    categories.map((c) => [String(c.Id), { ParentRef: (c as any).ParentRef }])
  )
  const marked = isMarkedForWebsite(
    item as any,
    resolution.id,
    categoriesById
  )
  const sku = String(item.Sku ?? "").trim()
  const linkedVariantId = await qb.variantIdForQboItem(String(item.Id))

  let matchingVariantIds: string[] = []
  if (marked && !linkedVariantId && sku) {
    const vres = await pg.raw(
      `select pv.id from product_variant pv
         join product p on p.id = pv.product_id and p.deleted_at is null
        where pv.deleted_at is null and (pv.upc = ? or pv.barcode = ? or pv.sku = ?)`,
      [sku, sku, sku]
    )
    matchingVariantIds = (vres?.rows || []).map((r: any) => String(r.id))
  }

  const decision = decideImportAction({
    isCategory: item.Type === "Category",
    isActive: item.Active !== false,
    isMarked: marked,
    hasSku: !!sku,
    linkedVariantId,
    matchingVariantIds,
  })

  // Diagnostics use FullyQualifiedName; decisions never do.
  const fqn = (item as any).FullyQualifiedName ?? item.Name

  if (decision.action === "ignore" || decision.action === "already_linked")
    return
  if (decision.action === "review") {
    await alertVisible(
      qb,
      sku || null,
      `WEBSITE IMPORT NEEDS REVIEW for "${fqn}" (QBO ${item.Id}): ${decision.reason}`
    )
    return
  }
  if (decision.action === "link") {
    await qb.mapVariantToQboItem(decision.variantId, String(item.Id))
    await qb.logSync({
      direction: "qbo_to_medusa",
      entityType: "import",
      sku,
      qboItemId: String(item.Id),
      status: "success",
      errorMessage: JSON.stringify({ linked_variant: decision.variantId, fqn }),
    })
    return
  }

  // action === "create": new draft Medusa product from the QuickBooks item.
  try {
    const defaults = (
      await pg.raw(
        `select (select id from sales_channel where deleted_at is null order by created_at limit 1) as channel,
                (select id from shipping_profile where deleted_at is null order by created_at limit 1) as profile,
                (select id from stock_location where deleted_at is null order by created_at limit 1) as location`
      )
    )?.rows?.[0]
    if (!defaults?.channel || !defaults?.profile || !defaults?.location) {
      await alertVisible(
        qb,
        sku,
        `WEBSITE IMPORT BLOCKED for "${fqn}": store is missing a default sales channel, shipping profile, or stock location`
      )
      return
    }
    const price = item.UnitPrice != null ? Number(item.UnitPrice) : 0
    // The QuickBooks item description lands ONLY in the separate QuickBooks
    // Description field (metadata) — the website description stays empty for
    // staff to write real marketing copy before publishing.
    const qbDesc = sanitizeQbDescription(item.Description)
    const { result } = await createProductsWorkflow(container as any).run({
      input: {
        products: [
          {
            title: item.Name,
            status: "draft", // staff add photo/category, then publish
            ...(qbDesc
              ? { metadata: { [QB_DESCRIPTION_METADATA_KEY]: qbDesc } }
              : {}),
            options: [{ title: "Default", values: ["Default"] }],
            sales_channels: [{ id: defaults.channel }],
            shipping_profile_id: defaults.profile,
            variants: [
              {
                title: "Default",
                sku,
                manage_inventory: true,
                options: { Default: "Default" },
                prices: [{ amount: price, currency_code: "usd" }],
              },
            ],
          },
        ],
      },
    })
    const created = (result as any[])[0]
    const variantId = created?.variants?.[0]?.id
    if (!variantId) throw new Error("product created but variant id missing")

    // Inventory wiring: item + link + level seeded with the QuickBooks qty.
    const inventory = container.resolve(Modules.INVENTORY)
    const invItems = await inventory.createInventoryItems([{ sku }])
    const invItem = Array.isArray(invItems) ? invItems[0] : invItems
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)
    await remoteLink.create({
      [Modules.PRODUCT]: { variant_id: variantId },
      [Modules.INVENTORY]: { inventory_item_id: invItem.id },
    })
    const qty = Math.max(0, Math.floor(Number(item.QtyOnHand ?? 0)))
    await inventory.createInventoryLevels([
      {
        inventory_item_id: invItem.id,
        location_id: defaults.location,
        stocked_quantity: qty,
      },
    ])

    await qb.mapVariantToQboItem(variantId, String(item.Id))
    await qb.logSync({
      direction: "qbo_to_medusa",
      entityType: "import",
      sku,
      qboItemId: String(item.Id),
      status: "success",
      errorMessage: JSON.stringify({
        created_product: created.id,
        created_variant: variantId,
        draft: true,
        initial_qty: qty,
        price,
        fqn,
      }),
    })
  } catch (e: any) {
    await alertVisible(
      qb,
      sku,
      `WEBSITE IMPORT FAILED for "${fqn}" (QBO ${item.Id}): ${String(e?.message || e).slice(0, 160)}`
    )
  }
}
