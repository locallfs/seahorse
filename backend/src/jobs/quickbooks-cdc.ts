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
export default async function quickbooksCdcSweep(container: MedusaContainer) {
  if (process.env.QUICKBOOKS_SYNC_ENABLED !== "true") return

  const qb = container.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService
  try {
    const conn = await qb.getConnection()
    if (!conn) return

    const changedSince = new Date(Date.now() - 20 * 60 * 1000).toISOString()
    const res = await qboRequest<{ CDCResponse?: any[] }>(qb, {
      method: "GET",
      path: `/cdc?entities=Item&changedSince=${encodeURIComponent(changedSince)}&minorversion=75`,
    })

    const ids = new Set<string>()
    for (const cdc of res.CDCResponse || []) {
      for (const qr of cdc?.QueryResponse || []) {
        for (const it of qr?.Item || []) {
          if (it?.status === "Deleted") continue
          if (it?.Id) ids.add(String(it.Id))
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
