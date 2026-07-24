/* eslint-disable @typescript-eslint/no-explicit-any */
import { MedusaContainer } from "@medusajs/types"
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { QUICKBOOKS_MODULE } from "../modules/quickbooks"
import type QuickbooksModuleService from "../modules/quickbooks/service"
import { qboRequest } from "../modules/quickbooks/qbo-client"
import { applyQboItemToStore } from "../modules/quickbooks/apply-item"
import { maybeImportMarkedItem } from "../modules/quickbooks/qbo-import"

// QBO → store sweeper. Every 5 minutes asks QuickBooks' Change Data Capture
// API "which Items changed in the last 20 minutes?" and applies each one to
// store stock. The 20-minute look-back overlaps runs so nothing slips between
// polls; re-applying an already-applied change is a no-op (equality skip in
// applyQboItemToStore). This guarantees QBO→store sync even while Intuit's
// webhook delivery is broken; webhooks remain the instant path when they work.
// Requires MEDUSA_WORKER_MODE=shared (or worker) to run.
// One heartbeat row per server boot so "is the sweeper alive?" is answerable
// from the sync log without server access. The first few sweeps after boot
// also log what CDC returned (even when empty) so silence is diagnosable.
let announced = false
let diagSweeps = 0

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

    // NOTE: ledger stamping is MANUAL-ONLY (admin route) — no boot-time or
    // scheduled execution, per owner directive 2026-07-23.

    // 30-min look-back (was 6h during debugging — that magnified post-resync
    // echo storms). Overlaps the 5-min cadence 6×; equality-skip and
    // last-write-wins in the applier make re-application a no-op.
    // QBO's docs use explicit-offset ISO timestamps ("...T10:00:00-07:00");
    // avoid the "Z" suffix and milliseconds in case they're misparsed as
    // company-local time (which would silently empty every response).
    const changedSince =
      new Date(Date.now() - 30 * 60 * 1000).toISOString().slice(0, 19) +
      "+00:00"
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
    // First 3 sweeps after boot: log the result even when empty, with entity
    // counts, so a silent-empty CDC is diagnosable from the sync log.
    if (diagSweeps < 3) {
      diagSweeps++
      const itemCount = (res.CDCResponse || [])
        .flatMap((c: any) => c?.QueryResponse || [])
        .reduce((n: number, qr: any) => n + (qr?.Item?.length || 0), 0)
      const adjCount = (res.CDCResponse || [])
        .flatMap((c: any) => c?.QueryResponse || [])
        .reduce(
          (n: number, qr: any) => n + (qr?.InventoryAdjustment?.length || 0),
          0
        )
      await qb
        .logSync({
          direction: "qbo_to_medusa",
          entityType: "cdc",
          sku: `sweep ${diagSweeps}: Item=${itemCount} Adj=${adjCount} apply=${ids.size}`,
          status: "success",
        })
        .catch(() => {})
    }

    // MONITOR: any coded store product still without a QuickBooks mapping
    // 30+ minutes after creation raises a VISIBLE alert (once per day each).
    try {
      const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      const stale = await pg.raw(
        `select pv.id as variant_id, p.title,
                coalesce(nullif(trim(coalesce(pv.upc,'')),''), nullif(trim(coalesce(pv.barcode,'')),''), nullif(trim(coalesce(pv.sku,'')),'')) as key
           from product p join product_variant pv on pv.product_id = p.id
          where p.deleted_at is null and pv.deleted_at is null
            and p.created_at < now() - interval '30 minutes'
            and p.created_at > now() - interval '7 days'
            and coalesce(nullif(trim(coalesce(pv.upc,'')),''), nullif(trim(coalesce(pv.barcode,'')),''), nullif(trim(coalesce(pv.sku,'')),'')) is not null
            and not exists (select 1 from quickbooks_item_map m where m.variant_id = pv.id and m.deleted_at is null)
            and not exists (select 1 from quickbooks_sync_log s where s.entity_type = 'monitor'
                             and s.sku = coalesce(nullif(trim(coalesce(pv.upc,'')),''), nullif(trim(coalesce(pv.barcode,'')),''), nullif(trim(coalesce(pv.sku,'')),''))
                             and s.created_at > date_trunc('day', now()))
          limit 10`
      )
      const rows = stale?.rows || []
      for (const r of rows) {
        await qb
          .logSync({
            direction: "medusa_to_qbo",
            entityType: "monitor",
            sku: r.key,
            status: "failed",
            errorMessage: `MONITOR: "${r.title}" has no QuickBooks item 30+ minutes after creation`,
          })
          .catch(() => {})
      }
      if (rows.length > 0) {
        await qb
          .recordError(
            `MONITOR: ${rows.length} product(s) still missing QuickBooks items 30+ min after creation (see activity log)`
          )
          .catch(() => {})
      }
    } catch {
      // monitoring must never break the sweep
    }

    if (ids.size === 0) return // quiet cycle — don't spam the log

    console.log(`[qb-cdc] ${ids.size} changed item(s)`)
    for (const id of ids) {
      await applyQboItemToStore(qb, container, id)
      // Website-marked QuickBooks items import/link to Medusa (CDC is the
      // catch-up path; the webhook does the same instantly when delivered).
      await maybeImportMarkedItem(qb, container, id).catch(() => {})
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
