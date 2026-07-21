/* eslint-disable @typescript-eslint/no-explicit-any */
import { MedusaContainer } from "@medusajs/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/utils"
import { QUICKBOOKS_MODULE } from "../modules/quickbooks"
import type QuickbooksModuleService from "../modules/quickbooks/service"
import { qboRequest } from "../modules/quickbooks/qbo-client"
import { applyQboItemToStore } from "../modules/quickbooks/apply-item"

// QBO → store sweeper. Every 5 minutes asks QuickBooks' Change Data Capture
// API "which Items changed in the last 20 minutes?" and applies each one to
// store stock. The 20-minute look-back overlaps runs so nothing slips between
// polls; re-applying an already-applied change is a no-op (equality skip in
// applyQboItemToStore). This guarantees QBO→store sync even while Intuit's
// webhook delivery is broken; webhooks remain the instant path when they work.
// Requires MEDUSA_WORKER_MODE=shared (or worker) to run.
// One heartbeat row per server boot so "is the sweeper alive?" is answerable
// from the sync log without server access.
let announced = false

export default async function quickbooksCdcSweep(container: MedusaContainer) {
  if (process.env.QUICKBOOKS_SYNC_ENABLED !== "true") return

  const qb = container.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService
  try {
    const conn = await qb.getConnection()
    if (!conn) return

    if (!announced) {
      announced = true
      await qb
        .logSync({
          direction: "qbo_to_medusa",
          entityType: "cdc",
          sku: "cdc sweeper online",
          status: "success",
        })
        .catch(() => {})
    }

    // 6h look-back: tiny cost at this catalog's change volume (equality-skip
    // makes re-application a no-op) and makes window-miss impossible.
    const changedSince = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    // Ask for changed Items AND changed InventoryAdjustments: QBO records a
    // quantity change as an adjustment transaction, which may not bump the
    // Item record itself — Item-only tracking can miss the one thing we sync.
    const res = await qboRequest<{ CDCResponse?: any[] }>(qb, {
      method: "GET",
      path: `/cdc?entities=Item,InventoryAdjustment&changedSince=${encodeURIComponent(changedSince)}&minorversion=75`,
    })

    const ids = new Set<string>()
    for (const cdc of res.CDCResponse || []) {
      for (const qr of cdc?.QueryResponse || []) {
        for (const it of qr?.Item || []) {
          if (it?.status === "Deleted") continue
          if (it?.Id) ids.add(String(it.Id))
        }
        for (const adj of qr?.InventoryAdjustment || []) {
          if (adj?.status === "Deleted") continue
          let lines = adj?.Line
          if (!Array.isArray(lines) && adj?.Id) {
            // Sparse CDC entry — fetch the adjustment to read its lines.
            try {
              const full = await qboRequest<any>(qb, {
                method: "GET",
                path: `/inventoryadjustment/${encodeURIComponent(String(adj.Id))}?minorversion=75`,
              })
              lines = full?.InventoryAdjustment?.Line
            } catch {
              lines = []
            }
          }
          for (const ln of lines || []) {
            const itemId = ln?.ItemAdjustmentLineDetail?.ItemRef?.value
            if (itemId) ids.add(String(itemId))
          }
        }
      }
    }
    if (ids.size === 0) return // quiet cycle — don't spam the log

    console.log(`[qb-cdc] ${ids.size} changed item(s)`)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const inventory = container.resolve(Modules.INVENTORY)
    for (const id of ids) {
      await applyQboItemToStore(qb, query, inventory, id)
    }
  } catch (err: any) {
    await qb
      .logSync({
        direction: "qbo_to_medusa",
        entityType: "cdc",
        status: "failed",
        errorMessage: `CDC sweep failed: ${err?.message || err}`,
      })
      .catch(() => {})
  }
}

export const config = {
  name: "quickbooks-cdc-sweep",
  schedule: "*/5 * * * *", // every 5 minutes
}
