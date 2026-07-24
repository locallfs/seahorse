/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { QUICKBOOKS_MODULE } from "../modules/quickbooks"
import type QuickbooksModuleService from "../modules/quickbooks/service"
import { resolveItemKey } from "../modules/quickbooks/mapping"
import { pushQuantityToQbo } from "../modules/quickbooks/sync"
import {
  defaultEnsureDeps,
  ensureQboItemForVariant,
} from "../modules/quickbooks/auto-create"

type SubscriberArgs = {
  event: { data: any }
  container: { resolve: (k: string) => any }
}

// Site → QuickBooks. On any stock-level change, push the affected variant(s)'
// on-hand quantity to their QuickBooks Inventory items. Disabled unless
// QUICKBOOKS_SYNC_ENABLED=true. ALL store-side reads are direct SQL —
// query.graph is banned in the sync paths (silent blanks in some contexts).
export default async function quickbooksInventorySync({
  event,
  container,
}: SubscriberArgs) {
  if (process.env.QUICKBOOKS_SYNC_ENABLED !== "true") return

  const qb = container.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService
  const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

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

    if (levelIds.length) {
      const res = await pg.raw(
        `select distinct inventory_item_id from inventory_level where id = any(?)`,
        [levelIds]
      )
      for (const row of res?.rows || []) {
        if (row?.inventory_item_id) itemIds.add(String(row.inventory_item_id))
      }
    }

    if (!itemIds.size) {
      console.warn(
        "[qb-sync] could not resolve inventory_item_id from event:",
        JSON.stringify(raw).slice(0, 200)
      )
      return
    }

    for (const invItemId of itemIds) {
      const vres = await pg.raw(
        `select pv.id,
                pv.title as variant_title,
                p.title as product_title,
                nullif(trim(coalesce(pv.sku,'')),'') as sku,
                nullif(trim(coalesce(pv.upc,'')),'') as upc,
                nullif(trim(coalesce(pv.barcode,'')),'') as barcode
           from product_variant_inventory_item l
           join product_variant pv on pv.id = l.variant_id and pv.deleted_at is null
           join product p on p.id = pv.product_id and p.deleted_at is null
          where l.inventory_item_id = ? and l.deleted_at is null`,
        [invItemId]
      )
      const qres = await pg.raw(
        `select coalesce(sum(stocked_quantity),0) as qty from inventory_level
          where inventory_item_id = ? and deleted_at is null`,
        [invItemId]
      )
      const qty = Math.max(0, Math.floor(Number(qres?.rows?.[0]?.qty ?? 0)))

      for (const variant of vres?.rows || []) {
        const key = resolveItemKey(variant)
        if (!key) continue
        // Old identifiers let the push re-find and re-stamp the QBO item if
        // the join key just changed (e.g. a UPC replaced the SKU). No name
        // matching — QBO-only items must never be grabbed by name.
        const fallbackKeys = [variant.barcode, variant.sku]
          .map((k: any) => String(k || "").trim())
          .filter((k: string) => k && k !== key)
        let res = await pushQuantityToQbo(qb, {
          key,
          qty,
          fallbackKeys,
          variantId: variant.id,
        })
        // AUTO-CREATE: a brand-new product has no QuickBooks item yet. Run
        // the exactly-once ensure workflow (duplicate-protected), then push
        // once more so the quantity lands. Ambiguity → visible alert, no
        // creation. QuickBooks-only local items are unaffected (this is the
        // store→QBO direction only).
        if (!res.ok && /No QuickBooks item found/.test(res.error ?? "")) {
          const ensured = await ensureQboItemForVariant(
            {
              variant_id: variant.id,
              product_title: variant.product_title,
              variant_title: variant.variant_title,
              sku: variant.sku,
              upc: variant.upc,
              barcode: variant.barcode,
            },
            defaultEnsureDeps(qb, pg)
          )
          if (ensured.outcome === "created") {
            await qb.logSync({
              direction: "medusa_to_qbo",
              entityType: "auto-create",
              sku: key,
              qboItemId: ensured.qboItemId,
              status: "success",
              errorMessage: JSON.stringify({
                created_qbo_item: ensured.qboItemId,
                initial_qty_set: ensured.initialQty,
              }),
            })
            continue // creation seeded the quantity; nothing left to push
          }
          if (ensured.outcome === "adopted") {
            res = await pushQuantityToQbo(qb, {
              key,
              qty,
              fallbackKeys,
              variantId: variant.id,
            })
          }
          // review / config_error / created_unmapped already raised their
          // own visible alerts inside the ensure workflow.
          if (
            ensured.outcome === "review" ||
            ensured.outcome === "config_error" ||
            ensured.outcome === "created_unmapped"
          ) {
            continue
          }
        }
        await qb.logSync({
          direction: "medusa_to_qbo",
          sku: key,
          qboItemId: res.qboItemId ?? null,
          status: res.ok ? "success" : "needs_manual_review",
          errorMessage: res.error ?? null,
        })
      }
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
