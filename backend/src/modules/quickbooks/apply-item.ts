/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContainerRegistrationKeys, Modules } from "@medusajs/utils"
import type QuickbooksModuleService from "./service"
import { getItemById } from "./items"

// QBO → store: re-reads one QuickBooks item and writes its quantity onto the
// matching store variant's stock levels. Skips levels already equal so the two
// sync directions can't loop. Shared by the webhook route and the CDC sweeper.
//
// The variant match uses query.graph on the variant's own columns (proven
// reliable). The variant→inventory-level hop reads the link and level tables
// directly via SQL: the graph-link expansion from the variant side silently
// returns empty in this Medusa version (verified in production 2026-07-21).
export async function applyQboItemToStore(
  qb: QuickbooksModuleService,
  scope: { resolve: (k: string) => any },
  qboItemId: string
): Promise<void> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const inventory = scope.resolve(Modules.INVENTORY)
  const pg = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const item = await getItemById(qb, qboItemId)
  if (!item) {
    await qb.logSync({
      direction: "qbo_to_medusa",
      qboItemId,
      status: "needs_manual_review",
      errorMessage: `QBO item ${qboItemId} not found`,
    })
    return
  }
  if (!item.Sku || !String(item.Sku).trim()) {
    await qb.logSync({
      direction: "qbo_to_medusa",
      qboItemId,
      status: "needs_manual_review",
      errorMessage: `QBO item "${item.Name}" (${qboItemId}) has no SKU/barcode to match by — run Resync all`,
    })
    return
  }
  const key = String(item.Sku).trim()
  const qty = Math.max(0, Math.floor(Number(item.QtyOnHand ?? 0)))

  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "sku", "upc", "barcode"],
    filters: { $or: [{ upc: key }, { barcode: key }, { sku: key }] },
  })

  const variant = (variants as any[])?.[0]
  if (!variant) {
    await qb.logSync({
      direction: "qbo_to_medusa",
      sku: key,
      qboItemId,
      status: "needs_manual_review",
      errorMessage: "No matching store product for this key",
    })
    return
  }

  // Link + level rows read straight from the tables — deterministic.
  const linkRes = await pg.raw(
    `select inventory_item_id from product_variant_inventory_item
     where variant_id = ? and deleted_at is null`,
    [variant.id]
  )
  const invItemIds: string[] = (linkRes?.rows || [])
    .map((r: any) => r.inventory_item_id)
    .filter(Boolean)

  let levels: { inventory_item_id: string; location_id: string; stocked_quantity: number }[] = []
  if (invItemIds.length) {
    const lvlRes = await pg.raw(
      `select inventory_item_id, location_id, stocked_quantity from inventory_level
       where inventory_item_id = any(?) and deleted_at is null`,
      [invItemIds]
    )
    levels = lvlRes?.rows || []
  }

  if (levels.length === 0) {
    await qb.logSync({
      direction: "qbo_to_medusa",
      sku: key,
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

  await inventory.updateInventoryLevels(updates)
  await qb.logSync({
    direction: "qbo_to_medusa",
    sku: key,
    qboItemId,
    status: "success",
  })
}
