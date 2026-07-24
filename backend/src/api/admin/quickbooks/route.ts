/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { QUICKBOOKS_MODULE } from "../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../modules/quickbooks/service"

function preview(val: string | undefined): string | null {
  if (!val) return null
  const trimmed = val.trim()
  if (!trimmed) return ""
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}…(${trimmed.length})`
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-2)} (${trimmed.length})`
}

export async function GET(req: any, res: any) {
  const service = req.scope.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService
  try {
    const connection = await service.getConnection()
    const [lastSyncAt, syncLog] = await Promise.all([
      service.lastSuccessfulSyncAt().catch(() => null),
      service.listSyncLogs(50).catch(() => []),
    ])

    // Product sync status: synced / pending (coded, unmapped, with age) /
    // recent failures are already visible in the activity log below.
    let productSync: any = null
    try {
      const pg = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      const counts = (
        await pg.raw(
          `select
             (select count(*)::int from quickbooks_item_map where deleted_at is null) as synced,
             (select count(*)::int from product_variant pv join product p on p.id = pv.product_id
               where pv.deleted_at is null and p.deleted_at is null
                 and coalesce(nullif(trim(coalesce(pv.upc,'')),''), nullif(trim(coalesce(pv.barcode,'')),''), nullif(trim(coalesce(pv.sku,'')),'')) is not null
                 and not exists (select 1 from quickbooks_item_map m where m.variant_id = pv.id and m.deleted_at is null)) as pending,
             (select count(*)::int from quickbooks_sync_log where status in ('failed','needs_manual_review') and created_at > now() - interval '24 hours') as failed_24h`
        )
      )?.rows?.[0]
      const pendingList = (
        await pg.raw(
          `select p.title,
                  coalesce(nullif(trim(coalesce(pv.upc,'')),''), nullif(trim(coalesce(pv.barcode,'')),''), nullif(trim(coalesce(pv.sku,'')),'')) as sku,
                  round(extract(epoch from (now() - p.created_at)) / 60)::int as age_minutes
             from product_variant pv join product p on p.id = pv.product_id
            where pv.deleted_at is null and p.deleted_at is null
              and coalesce(nullif(trim(coalesce(pv.upc,'')),''), nullif(trim(coalesce(pv.barcode,'')),''), nullif(trim(coalesce(pv.sku,'')),'')) is not null
              and not exists (select 1 from quickbooks_item_map m where m.variant_id = pv.id and m.deleted_at is null)
            order by p.created_at desc limit 15`
        )
      )?.rows
      productSync = { ...counts, pending_list: pendingList }
    } catch {
      productSync = null
    }

    const envCheck = {
      QUICKBOOKS_CLIENT_ID: preview(process.env.QUICKBOOKS_CLIENT_ID),
      QUICKBOOKS_CLIENT_SECRET: preview(process.env.QUICKBOOKS_CLIENT_SECRET),
      QUICKBOOKS_REDIRECT_URI: process.env.QUICKBOOKS_REDIRECT_URI || null,
      QUICKBOOKS_ENCRYPTION_KEY: preview(process.env.QUICKBOOKS_ENCRYPTION_KEY),
      QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN: preview(
        process.env.QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN
      ),
      QUICKBOOKS_ENVIRONMENT: process.env.QUICKBOOKS_ENVIRONMENT || null,
    }
    const configured = Boolean(
      process.env.QUICKBOOKS_CLIENT_ID &&
        process.env.QUICKBOOKS_CLIENT_SECRET &&
        process.env.QUICKBOOKS_REDIRECT_URI
    )

    const health = !connection
      ? "disconnected"
      : connection.refresh_token_expires_at &&
          new Date(connection.refresh_token_expires_at).getTime() < Date.now()
        ? "token_expired"
        : "connected"

    res.json({
      configured,
      connected: !!connection,
      connection,
      environment: process.env.QUICKBOOKS_ENVIRONMENT || "sandbox",
      env_check: envCheck,
      sync_enabled: process.env.QUICKBOOKS_SYNC_ENABLED === "true",
      health,
      last_sync_at: lastSyncAt,
      sync_log: syncLog,
      product_sync: productSync,
    })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to load status" })
  }
}
