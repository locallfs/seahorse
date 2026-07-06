/* eslint-disable @typescript-eslint/no-explicit-any */
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
    })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to load status" })
  }
}
