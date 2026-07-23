/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { QUICKBOOKS_MODULE } from "."
import type QuickbooksModuleService from "./service"
import {
  createInventoryAdjustment,
  createInventoryItem,
  deactivateItem,
  findAdjustmentAccountId,
  findInventoryAccounts,
  listAllActiveItems,
  updateItemSparse,
  type QboItem,
} from "./items"
import { itemDisplayName, resolveItemKey, variantOnHand } from "./mapping"

export type SeedResult = {
  created: number
  updated: number
  converted: number
  unchanged: number
  skipped: number
  failed: number
}

const norm = (s: string) => s.trim().toLowerCase()
const round2 = (n: number) => Math.round(n * 100) / 100

// MASTER-FOR-MATCHES resync: the store catalog overwrites the QBO items it
// matches, and creates the ones it's missing. Items that exist only in
// QuickBooks are NEVER touched (owner-approved 2026-07-23 after a retire
// step wiped 680 owner-added items — retirement is permanently removed).
// - Store variant matches a QBO item (by join key, else by display name):
//   - Inventory item → overwrite Sku/Name/QtyOnHand/UnitPrice to store values
//   - Service/NonInventory item → retire that matched item (QBO frees the
//     name) and recreate as Inventory, since only Inventory items hold stock
// - No match → create a new Inventory item with the store's current stock
// Shared by the seed script and the admin "Resync all" button. Idempotent.
export async function seedInventoryItems(container: {
  resolve: (k: string) => any
}): Promise<SeedResult> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const qb = container.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService

  const accounts = await findInventoryAccounts(qb)
  const invStartDate = new Date().toISOString().slice(0, 10)

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "description",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.upc",
      "variants.barcode",
      "variants.prices.amount",
      "variants.prices.currency_code",
      "variants.inventory_items.inventory.location_levels.stocked_quantity",
    ],
  })

  const all = await listAllActiveItems(qb)
  const bySku = new Map<string, QboItem>()
  const byName = new Map<string, QboItem>()
  for (const it of all) {
    if (it.Sku && String(it.Sku).trim()) bySku.set(norm(String(it.Sku)), it)
    byName.set(norm(it.Name), it)
  }

  let adjustAccountId: string | null = null
  const r: SeedResult = {
    created: 0,
    updated: 0,
    converted: 0,
    unchanged: 0,
    skipped: 0,
    failed: 0,
  }

  for (const product of products as any[]) {
    for (const variant of product.variants || []) {
      const key = resolveItemKey(variant)
      if (!key) {
        r.skipped++
        continue
      }
      const name = itemDisplayName(product.title, variant.title)
      const qty = variantOnHand(variant)
      const prices = (variant.prices || []) as any[]
      const usd = prices.find((p) => p?.currency_code === "usd") || prices[0]
      const price =
        usd && typeof usd.amount === "number" ? round2(usd.amount) : undefined

      const existing = bySku.get(norm(key)) || byName.get(norm(name))
      try {
        if (existing) {
          if (existing.Type === "Inventory") {
            // Sku/Name/Price go through an Item update; quantity can NOT —
            // QBO silently ignores QtyOnHand on updates, so quantity moves
            // via an InventoryAdjustment transaction instead.
            const fields: Record<string, unknown> = {}
            if (String(existing.Sku || "").trim() !== key) fields.Sku = key
            if (existing.Name !== name) fields.Name = name
            if (
              price != null &&
              round2(Number(existing.UnitPrice ?? -1)) !== price
            ) {
              fields.UnitPrice = price
            }
            let acted = false
            if (Object.keys(fields).length) {
              await updateItemSparse(qb, {
                itemId: existing.Id,
                syncToken: existing.SyncToken,
                fields,
              })
              acted = true
            }
            const exQty = Math.max(
              0,
              Math.floor(Number(existing.QtyOnHand ?? 0))
            )
            if (exQty !== qty) {
              adjustAccountId =
                adjustAccountId || (await findAdjustmentAccountId(qb))
              await createInventoryAdjustment(qb, {
                itemId: existing.Id,
                qtyDiff: qty - exQty,
                adjustAccountId,
                note: `Master resync from store (${key})`,
              })
              acted = true
            }
            if (acted) {
              r.updated++
            } else {
              r.unchanged++
            }
          } else {
            // Wrong type — can't hold stock, and the API can't change an
            // item's type in place. Retire it (frees the name) and recreate.
            await deactivateItem(qb, {
              itemId: existing.Id,
              syncToken: existing.SyncToken,
            })
            await createInventoryItem(qb, {
              name,
              sku: key,
              qtyOnHand: qty,
              unitPrice: price,
              description: product.description ?? undefined,
              accounts,
              invStartDate,
            })
            r.converted++
          }
        } else {
          await createInventoryItem(qb, {
            name,
            sku: key,
            qtyOnHand: qty,
            unitPrice: price,
            description: product.description ?? undefined,
            accounts,
            invStartDate,
          })
          r.created++
        }
      } catch (err: any) {
        r.failed++
        await qb
          .logSync({
            direction: "medusa_to_qbo",
            entityType: "resync",
            sku: key,
            status: "failed",
            errorMessage: `${name}: ${err?.message}`,
          })
          .catch(() => {})
      }
    }
  }

  // NOTE (2026-07-23, owner-approved change): resync NEVER retires QBO items
  // anymore. Items added directly in QuickBooks are left completely alone —
  // a prior retire step here wiped 680 owner-added items and is removed.

  // One summary row so the page's activity list + "Last successful sync"
  // reflect the run (counts also land in the server logs).
  await qb
    .logSync({
      direction: "medusa_to_qbo",
      entityType: "resync",
      sku: `resync: ${r.created} created, ${r.updated} overwritten, ${r.converted} converted, ${r.failed} failed`,
      status: r.failed > 0 ? "needs_manual_review" : "success",
    })
    .catch(() => {})

  return r
}
