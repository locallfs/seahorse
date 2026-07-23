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
import { itemDisplayName } from "./mapping"
import {
  assertCatalogIdentifiersPresent,
  readCatalogVariants,
} from "./db-reads"

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
// - Store variant matches a QBO item (ledger id first, then identifier trail
//   UPC → barcode → SKU — name matching is banned):
//   - Inventory item → overwrite Sku/Name/QtyOnHand/UnitPrice to store values
//   - Service/NonInventory item → retire that matched item (QBO frees the
//     name) and recreate as Inventory, since only Inventory items hold stock
// - No match → create a new Inventory item with the store's current stock
// ALL store-side reads are direct SQL (db-reads.ts); the regression guard
// aborts before any QBO write if the catalog read comes back identifier-less.
// Shared by the seed script and the admin "Resync all" button. Idempotent.
export async function seedInventoryItems(container: {
  resolve: (k: string) => any
}): Promise<SeedResult> {
  const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const qb = container.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService

  const rows = await readCatalogVariants(pg)
  assertCatalogIdentifiersPresent(rows) // abort before ANY QBO write

  const accounts = await findInventoryAccounts(qb)
  const invStartDate = new Date().toISOString().slice(0, 10)

  const all = await listAllActiveItems(qb)
  // Match by the permanent variant↔item ledger first, then by OUR stamped
  // identifiers (UPC → barcode → old SKU). Name matching is banned: QBO-only
  // items (owner's local water/services) must never be grabbed by a website
  // product that happens to share a name.
  const bySku = new Map<string, QboItem>()
  const byId = new Map<string, QboItem>()
  for (const it of all) {
    if (it.Sku && String(it.Sku).trim()) bySku.set(norm(String(it.Sku)), it)
    byId.set(String(it.Id), it)
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

  for (const row of rows) {
    {
      const key = row.upc || row.barcode || row.sku || ""
      if (!key) {
        r.skipped++
        continue
      }
      const name = itemDisplayName(row.product_title, row.variant_title)
      const qty = Math.max(0, Math.floor(row.on_hand))
      const price = row.usd_amount != null ? round2(row.usd_amount) : undefined

      // Ledger first: the stored QBO item id survives any identifier change.
      let existing: QboItem | undefined
      const mappedId = await qb.qboItemIdForVariant(row.variant_id)
      if (mappedId) existing = byId.get(String(mappedId))
      // Identifier trail fallback (first pairing, or ledger points at a
      // retired item): current key, then the variant's other codes.
      if (!existing) {
        const trail = [row.upc, row.barcode, row.sku].filter(
          Boolean
        ) as string[]
        for (const t of trail) {
          existing = bySku.get(norm(t))
          if (existing) break
        }
      }
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
            await qb.mapVariantToQboItem(row.variant_id, String(existing.Id))
          } else {
            // Wrong type — can't hold stock, and the API can't change an
            // item's type in place. Retire it (frees the name) and recreate.
            await deactivateItem(qb, {
              itemId: existing.Id,
              syncToken: existing.SyncToken,
            })
            const madeItem = await createInventoryItem(qb, {
              name,
              sku: key,
              qtyOnHand: qty,
              unitPrice: price,
              description: row.description ?? undefined,
              accounts,
              invStartDate,
            })
            await qb.mapVariantToQboItem(row.variant_id, String(madeItem.Id))
            r.converted++
          }
        } else {
          const madeItem = await createInventoryItem(qb, {
            name,
            sku: key,
            qtyOnHand: qty,
            unitPrice: price,
            description: row.description ?? undefined,
            accounts,
            invStartDate,
          })
          await qb.mapVariantToQboItem(row.variant_id, String(madeItem.Id))
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
