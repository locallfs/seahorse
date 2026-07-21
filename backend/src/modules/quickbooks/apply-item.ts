/* eslint-disable @typescript-eslint/no-explicit-any */
import type QuickbooksModuleService from "./service"
import { getItemById } from "./items"

// QBO → store: re-reads one QuickBooks item and writes its quantity onto the
// matching store variant's stock levels. Skips levels already equal so the two
// sync directions can't loop. Shared by the webhook route and the CDC sweeper.
export async function applyQboItemToStore(
  qb: QuickbooksModuleService,
  query: any,
  inventory: any,
  qboItemId: string
): Promise<void> {
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
    fields: [
      "id",
      "sku",
      "upc",
      "barcode",
      "inventory_items.inventory_item_id",
      "inventory_items.inventory.location_levels.location_id",
      "inventory_items.inventory.location_levels.stocked_quantity",
    ],
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

  const updates: {
    inventory_item_id: string
    location_id: string
    stocked_quantity: number
  }[] = []
  let levelsSeen = 0
  for (const ii of variant.inventory_items || []) {
    for (const lvl of ii?.inventory?.location_levels || []) {
      levelsSeen++
      const current = Number(lvl?.stocked_quantity ?? 0)
      if (current === qty) continue // already in sync — skip to avoid a loop
      updates.push({
        inventory_item_id: ii.inventory_item_id,
        location_id: lvl.location_id,
        stocked_quantity: qty,
      })
    }
  }

  if (levelsSeen === 0) {
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
  if (updates.length === 0) return // already equal everywhere — normal no-op
  await inventory.updateInventoryLevels(updates)
  await qb.logSync({
    direction: "qbo_to_medusa",
    sku: key,
    qboItemId,
    status: "success",
  })
}
