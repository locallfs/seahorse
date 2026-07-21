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

    const data = event?.data || {}
    let inventoryItemId: string | undefined =
      data.inventory_item_id || data.inventory_item?.id

    // Fall back to looking up the level by id to find its inventory item.
    if (!inventoryItemId && data.id) {
      try {
        const { data: levels } = await query.graph({
          entity: "inventory_level",
          fields: ["inventory_item_id"],
          filters: { id: data.id },
        })
        inventoryItemId = levels?.[0]?.inventory_item_id
      } catch {
        // entity/field name may differ by version; verified at enable time.
      }
    }

    if (!inventoryItemId) {
      console.warn(
        "[qb-sync] could not resolve inventory_item_id from event:",
        JSON.stringify(data).slice(0, 200)
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
        inventory_items: { inventory_item_id: inventoryItemId },
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

export const config = { event: "inventory-level.updated" }
