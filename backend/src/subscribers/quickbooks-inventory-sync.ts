/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { QUICKBOOKS_MODULE } from "../modules/quickbooks"
import type QuickbooksModuleService from "../modules/quickbooks/service"
import {
  itemDisplayName,
  resolveItemKey,
  variantOnHand,
} from "../modules/quickbooks/mapping"
import { pushQuantityToQbo } from "../modules/quickbooks/sync"

type SubscriberArgs = {
  event: { data: any }
  container: { resolve: (k: string) => any }
}

// Site → QuickBooks. On any stock-level change, push the affected variant(s)'
// on-hand quantity to their QuickBooks Inventory items. Disabled unless
// QUICKBOOKS_SYNC_ENABLED=true, so it deploys dormant.
//
// NOTE: the inventory-level.updated payload shape and the level→inventory-item
// lookup are handled defensively; verify against the sandbox when sync is first
// enabled (a mismatch logs a warning rather than throwing).
export default async function quickbooksInventorySync({
  event,
  container,
}: SubscriberArgs) {
  if (process.env.QUICKBOOKS_SYNC_ENABLED !== "true") return

  const qb = container.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const conn = await qb.getConnection()
    if (!conn) return

    // Payload may be a single object or a batch; entries carry either the
    // inventory_item_id directly or just the level's id.
    const raw: any = event?.data || {}
    const entries: any[] = Array.isArray(raw) ? raw : [raw]
    const levelIds: string[] = []
    const itemIds = new Set<string>()
    for (const e of entries) {
      if (e?.inventory_item_id) itemIds.add(String(e.inventory_item_id))
      else if (e?.inventory_item?.id) itemIds.add(String(e.inventory_item.id))
      else if (e?.id) levelIds.push(String(e.id))
    }

    // Resolve level ids → inventory item ids (alias name varies by version).
    if (levelIds.length) {
      for (const entity of ["inventory_level", "inventory_levels"]) {
        try {
          const { data: levels } = await query.graph({
            entity,
            fields: ["inventory_item_id"],
            filters: { id: levelIds },
          })
          for (const lvl of (levels as any[]) || []) {
            if (lvl?.inventory_item_id) itemIds.add(String(lvl.inventory_item_id))
          }
          if ((levels as any[])?.length) break
        } catch {
          // try the next alias
        }
      }
    }

    if (!itemIds.size) {
      console.warn(
        "[qb-sync] could not resolve inventory_item_id from event:",
        JSON.stringify(raw).slice(0, 200)
      )
      return
    }

    const { data: variants } = await query.graph({
      entity: "variant",
      fields: [
        "id",
        "title",
        "sku",
        "upc",
        "barcode",
        "product.title",
        "inventory_items.inventory_item_id",
        "inventory_items.inventory.location_levels.stocked_quantity",
      ],
      filters: {
        inventory_items: { inventory_item_id: Array.from(itemIds) },
      } as any,
    })

    for (const variant of (variants as any[]) || []) {
      const key = resolveItemKey(variant)
      if (!key) continue
      const qty = variantOnHand(variant)
      // Old identifiers + display name let the push re-find and re-stamp the
      // QBO item if the join key just changed (e.g. a UPC was added).
      const fallbackKeys = [variant.barcode, variant.sku]
        .map((k: any) => String(k || "").trim())
        .filter((k: string) => k && k !== key)
      const name = variant.product?.title
        ? itemDisplayName(variant.product.title, variant.title)
        : undefined
      const res = await pushQuantityToQbo(qb, { key, qty, fallbackKeys, name })
      await qb.logSync({
        direction: "medusa_to_qbo",
        sku: key,
        qboItemId: res.qboItemId ?? null,
        status: res.ok ? "success" : "needs_manual_review",
        errorMessage: res.error ?? null,
      })
    }
  } catch (err: any) {
    await qb
      .logSync({
        direction: "medusa_to_qbo",
        status: "failed",
        errorMessage: err?.message || String(err),
      })
      .catch(() => {})
  }
}

// The installed Medusa version namespaces module events (InventoryEvents in
// @medusajs/utils): "inventory.inventory-level.updated", not the bare
// "inventory-level.updated". Also listen for created — the first stock entry
// on a product creates its level rather than updating one.
export const config = {
  event: [
    "inventory.inventory-level.updated",
    "inventory.inventory-level.created",
  ],
}
