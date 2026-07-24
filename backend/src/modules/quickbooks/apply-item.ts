/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContainerRegistrationKeys, Modules } from "@medusajs/utils"
import type QuickbooksModuleService from "./service"
import { getItemById } from "./items"
import { readVariantById, readVariantByIdentifier } from "./db-reads"
import {
  QB_DESCRIPTION_METADATA_KEY,
  decideQboDescriptionImport,
} from "./qb-description"

// QBO → store: re-reads one QuickBooks item and writes its quantity onto the
// matching store variant's stock levels. Skips levels already equal so the two
// sync directions can't loop. Shared by the webhook route and the CDC sweeper.
// ALL store-side reads are direct SQL (see db-reads.ts) — query.graph is
// banned in this module for returning silent blanks in some contexts.
export async function applyQboItemToStore(
  qb: QuickbooksModuleService,
  scope: { resolve: (k: string) => any },
  qboItemId: string
): Promise<void> {
  const inventory = scope.resolve(Modules.INVENTORY)
  const pg = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const item = await getItemById(qb, qboItemId)
  if (!item) return // transient fetch failure — next sweep retries

  const key = String(item.Sku ?? "").trim()
  const qty = Math.max(0, Math.floor(Number(item.QtyOnHand ?? 0)))

  // Ledger first: the stored pairing survives SKU→UPC replacement and works
  // even when the QBO item carries no Sku at all.
  let variant = null
  const mappedVariantId = await qb.variantIdForQboItem(String(item.Id))
  if (mappedVariantId) {
    variant = await readVariantById(pg, mappedVariantId)
  }
  if (!variant && key) {
    variant = await readVariantByIdentifier(pg, key)
    if (variant) {
      await qb
        .mapVariantToQboItem(variant.variant_id, String(item.Id))
        .catch(() => {})
    }
  }
  // No match → this is a QuickBooks-only item (owner's local water/services).
  // By design the site never touches those: silently ignore.
  if (!variant) return

  // Description: a QuickBooks item description lands ONLY in the separate
  // QuickBooks Description field (product.metadata.quickbooks_description).
  // It NEVER touches the website description (product.description), and a
  // blank QuickBooks description never erases anything.
  try {
    const metaRes = await pg.raw(
      `select p.id, p.metadata->>'${QB_DESCRIPTION_METADATA_KEY}' as qb_description
         from product p join product_variant pv on pv.product_id = p.id
        where pv.id = ? limit 1`,
      [variant.variant_id]
    )
    const prod = metaRes?.rows?.[0]
    if (prod?.id) {
      const imp = decideQboDescriptionImport(item.Description, prod.qb_description)
      if (imp.write) {
        await pg.raw(
          `update product
              set metadata = coalesce(metadata, '{}'::jsonb)
                             || jsonb_build_object('${QB_DESCRIPTION_METADATA_KEY}', ?::text)
            where id = ?`,
          [imp.value, prod.id]
        )
      }
    }
  } catch (e: any) {
    // Non-fatal: stock sync below must still run; surface, don't hide.
    console.log(`[qb-apply] qb-description import failed for ${qboItemId}: ${e?.message}`)
  }

  // Link + level rows read straight from the tables — deterministic.
  const linkRes = await pg.raw(
    `select inventory_item_id from product_variant_inventory_item
     where variant_id = ? and deleted_at is null`,
    [variant.variant_id]
  )
  const invItemIds: string[] = (linkRes?.rows || [])
    .map((r: any) => r.inventory_item_id)
    .filter(Boolean)

  let levels: {
    inventory_item_id: string
    location_id: string
    stocked_quantity: number
    updated_at?: string | Date
  }[] = []
  if (invItemIds.length) {
    const lvlRes = await pg.raw(
      `select inventory_item_id, location_id, stocked_quantity, updated_at from inventory_level
       where inventory_item_id = any(?) and deleted_at is null`,
      [invItemIds]
    )
    levels = lvlRes?.rows || []
  }

  const logKey = key || variant.sku || variant.upc || variant.variant_id

  if (levels.length === 0) {
    await qb.logSync({
      direction: "qbo_to_medusa",
      sku: logKey,
      qboItemId,
      status: "needs_manual_review",
      errorMessage:
        "Store product has no stock level record to write to (no location level found)",
    })
    return
  }

  const updates = levels
    .filter((lvl) => Number(lvl.stocked_quantity ?? 0) !== qty) // equality-skip: no loops
    .map((lvl) => ({
      inventory_item_id: lvl.inventory_item_id,
      location_id: lvl.location_id,
      stocked_quantity: qty,
    }))

  if (updates.length === 0) return // already equal everywhere — normal no-op

  // LAST-WRITE-WINS: if the store's stock record was touched more recently
  // than the QuickBooks item changed, the store's number is newer — never
  // shove an older QBO value over a fresh store edit (this reverted staff
  // edits whenever a store→QBO push had failed, e.g. on rate limits).
  const qboChangedAt = Date.parse(item.MetaData?.LastUpdatedTime ?? "")
  const storeTouchedAt = Math.max(
    ...levels.map((l) => new Date(l.updated_at ?? 0).getTime() || 0)
  )
  if (qboChangedAt > 0 && storeTouchedAt > qboChangedAt) {
    console.log(
      `[qb-apply] store newer than QBO for ${logKey} — keeping store value`
    )
    return
  }

  await inventory.updateInventoryLevels(updates)
  await qb.logSync({
    direction: "qbo_to_medusa",
    sku: logKey,
    qboItemId,
    status: "success",
  })
}
