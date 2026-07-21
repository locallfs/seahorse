/* eslint-disable @typescript-eslint/no-explicit-any */
import type QuickbooksModuleService from "./service"
import {
  createInventoryAdjustment,
  findAdjustmentAccountId,
  findItemBySku,
  findItemByName,
  updateItemSparse,
} from "./items"

const RETRY_DELAYS_MS = [1000, 5000, 30000]

// QBO account ids are stable for the life of a company — cache the
// adjustment account after the first lookup.
let cachedAdjustAccountId: string | null = null

// Pushes an absolute on-hand quantity to the matching QBO Inventory item,
// retrying transient failures (1s → 5s → 30s). Returns the outcome so the
// caller can write a sync-log row.
//
// Self-healing lookup: primary key first, then fallback keys (old barcode/SKU),
// then exact display name. When the item is found under a fallback — e.g. a
// UPC was just added to a variant that was seeded by SKU — the item's Sku is
// re-stamped to the primary key in the same write, so future pushes match
// directly.
export async function pushQuantityToQbo(
  qb: QuickbooksModuleService,
  params: {
    key: string
    qty: number
    fallbackKeys?: string[]
    name?: string
  }
): Promise<{ ok: boolean; qboItemId?: string; error?: string }> {
  let lastErr = ""
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      let item = await findItemBySku(qb, params.key)
      let adopt = false
      if (!item) {
        for (const fk of params.fallbackKeys || []) {
          const candidate = (fk || "").trim()
          if (!candidate || candidate === params.key) continue
          item = await findItemBySku(qb, candidate)
          if (item) {
            adopt = true
            break
          }
        }
      }
      if (!item && params.name) {
        item = await findItemByName(qb, params.name)
        if (item) adopt = true
      }
      if (!item) {
        return {
          ok: false,
          error: `No QuickBooks item found for "${params.key}"`,
        }
      }
      if (item.Type !== "Inventory") {
        return {
          ok: false,
          error: `QuickBooks item "${item.Name}" is ${item.Type} and can't hold stock — run "Resync all" to convert it`,
        }
      }

      const target = Math.max(0, Math.floor(params.qty))
      const current = Math.max(0, Math.floor(Number(item.QtyOnHand ?? 0)))

      if (adopt) {
        // Re-stamp the item's Sku to the new join key (QtyOnHand can NOT ride
        // along — QBO ignores it on updates; quantity moves via adjustment).
        await updateItemSparse(qb, {
          itemId: item.Id,
          syncToken: item.SyncToken,
          fields: { Sku: params.key },
        })
      }

      if (current !== target) {
        // Only write when different so the two directions don't loop.
        if (!cachedAdjustAccountId) {
          cachedAdjustAccountId = await findAdjustmentAccountId(qb)
        }
        await createInventoryAdjustment(qb, {
          itemId: item.Id,
          qtyDiff: target - current,
          adjustAccountId: cachedAdjustAccountId,
          note: `Auto-sync from store (${params.key})`,
        })
      }
      return { ok: true, qboItemId: item.Id }
    } catch (err: any) {
      lastErr = err?.message || String(err)
      if (attempt < RETRY_DELAYS_MS.length) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]))
      }
    }
  }
  return { ok: false, error: lastErr }
}
