/* eslint-disable @typescript-eslint/no-explicit-any */
import type QuickbooksModuleService from "./service"
import { findItemBySku, setItemQuantity } from "./items"

const RETRY_DELAYS_MS = [1000, 5000, 30000]

// Pushes an absolute on-hand quantity to the matching QBO Inventory item,
// retrying transient failures (1s → 5s → 30s). Returns the outcome so the
// caller can write a sync-log row.
export async function pushQuantityToQbo(
  qb: QuickbooksModuleService,
  params: { key: string; qty: number }
): Promise<{ ok: boolean; qboItemId?: string; error?: string }> {
  let lastErr = ""
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const item = await findItemBySku(qb, params.key)
      if (!item) {
        return {
          ok: false,
          error: `No QuickBooks item found for "${params.key}"`,
        }
      }
      const target = Math.max(0, Math.floor(params.qty))
      if (typeof item.QtyOnHand === "number" && item.QtyOnHand === target) {
        // Already in sync — skip the write so the two directions don't loop.
        return { ok: true, qboItemId: item.Id }
      }
      await setItemQuantity(qb, {
        itemId: item.Id,
        syncToken: item.SyncToken,
        qtyOnHand: target,
      })
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
