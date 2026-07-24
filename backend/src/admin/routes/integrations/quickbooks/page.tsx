import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
  toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"

declare const __BACKEND_URL__: string | undefined

interface Connection {
  id: string
  realm_id: string
  environment: string
  access_token_expires_at: string
  refresh_token_expires_at: string | null
  last_error: string | null
}

interface SyncLogRow {
  id: string
  direction: string
  sku: string | null
  status: string
  error_message: string | null
  created_at: string
}

interface ProductSyncStatus {
  synced: number
  pending: number
  failed_24h: number
  pending_list: { title: string; sku: string; age_minutes: number }[]
}

interface StatusPayload {
  configured: boolean
  connected: boolean
  connection: Connection | null
  environment: string
  env_check?: Record<string, string | null>
  sync_enabled?: boolean
  health?: string
  last_sync_at?: string | null
  sync_log?: SyncLogRow[]
  product_sync?: ProductSyncStatus | null
}

const QuickbooksPage = () => {
  const backendUrl = __BACKEND_URL__ ?? ""
  const [status, setStatus] = useState<StatusPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [resyncing, setResyncing] = useState(false)

  const loadStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${backendUrl}/admin/quickbooks`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as StatusPayload
      setStatus(data)
    } catch {
      toast.error("Failed to load QuickBooks status")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
    const params = new URLSearchParams(window.location.search)
    if (params.get("qb_connected") === "1") {
      toast.success("QuickBooks connected")
      window.history.replaceState({}, "", window.location.pathname)
    }
    const qbErr = params.get("qb_error")
    if (qbErr) {
      toast.error(`QuickBooks error: ${qbErr}`)
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  const connect = async () => {
    setActing(true)
    try {
      const res = await fetch(`${backendUrl}/admin/quickbooks/oauth-start`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) {
        const msg =
          (await res.json().catch(() => ({}))).error || "Failed to start OAuth"
        throw new Error(msg)
      }
      const { url } = (await res.json()) as { url: string }
      window.location.href = url
    } catch (err: any) {
      toast.error(err?.message || "Failed to start OAuth")
      setActing(false)
    }
  }

  const disconnect = async () => {
    if (!confirm("Disconnect QuickBooks? Sync will stop until reconnected."))
      return
    setActing(true)
    try {
      const res = await fetch(`${backendUrl}/admin/quickbooks/disconnect`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("QuickBooks disconnected")
      await loadStatus()
    } catch (err: any) {
      toast.error(err?.message || "Failed to disconnect")
    } finally {
      setActing(false)
    }
  }

  const resync = async () => {
    if (
      !confirm(
        "Push the store catalog to QuickBooks? Matching QuickBooks items are overwritten (stock, price, name, barcode) and missing ones are created. Items that exist only in QuickBooks are left completely alone. Safe to re-run."
      )
    )
      return
    setResyncing(true)
    try {
      const res = await fetch(`${backendUrl}/admin/quickbooks/resync`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const r = data.result || {}
      toast.success(
        `Resync done — created ${r.created}, overwritten ${r.updated}, converted ${r.converted}, failed ${r.failed}`
      )
      await loadStatus()
    } catch (err: any) {
      toast.error(err?.message || "Resync failed")
    } finally {
      setResyncing(false)
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return "—"
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">QuickBooks Online</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Two-way inventory sync between the store and QuickBooks.
          </Text>
        </div>
        {status?.health === "token_expired" ? (
          <StatusBadge color="orange">Reconnect needed</StatusBadge>
        ) : status?.connected ? (
          <StatusBadge color="green">Connected</StatusBadge>
        ) : (
          <StatusBadge color="grey">Not connected</StatusBadge>
        )}
      </div>

      <div className="flex flex-col gap-4 px-6 py-6">
        {loading && <Text size="small">Loading…</Text>}

        {!loading && status && !status.configured && (
          <div className="rounded border border-ui-border-error bg-ui-bg-base p-4 flex flex-col gap-2">
            <Text className="text-ui-fg-error">
              Backend is missing one or more QuickBooks env vars. Set them on
              Railway, redeploy, then return here.
            </Text>
            {status.env_check && (
              <div className="rounded bg-ui-bg-subtle p-3 font-mono text-xs">
                {Object.entries(status.env_check).map(([key, previewVal]) => (
                  <div key={key} className="flex justify-between gap-4">
                    <span>{key}</span>
                    <span
                      className={
                        previewVal === null || previewVal === ""
                          ? "text-ui-fg-error"
                          : "text-ui-fg-subtle"
                      }
                    >
                      {previewVal === null
                        ? "(not set)"
                        : previewVal === ""
                          ? "(empty)"
                          : previewVal}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && status && status.configured && (
          <>
            <div className="flex items-center gap-2">
              <Text size="small" className="text-ui-fg-subtle">
                Environment:
              </Text>
              <Badge
                size="2xsmall"
                color={status.environment === "production" ? "green" : "orange"}
              >
                {status.environment}
              </Badge>
            </div>

            {status.connected && status.connection && (
              <div className="grid grid-cols-2 gap-4 rounded border border-ui-border-base p-4">
                <div>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    Realm (Company) ID
                  </Text>
                  <Text size="small">{status.connection.realm_id}</Text>
                </div>
                <div>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    Access token expires
                  </Text>
                  <Text size="small">
                    {formatDate(status.connection.access_token_expires_at)}
                  </Text>
                </div>
                <div>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    Refresh token expires
                  </Text>
                  <Text size="small">
                    {formatDate(status.connection.refresh_token_expires_at)}
                  </Text>
                </div>
                {status.connection.last_error && (
                  <div className="col-span-2">
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      Last error
                    </Text>
                    <Text size="small" className="text-ui-fg-error">
                      {status.connection.last_error}
                    </Text>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {!status.connected && (
                <Button
                  variant="primary"
                  onClick={connect}
                  isLoading={acting}
                  disabled={acting}
                >
                  Connect to QuickBooks
                </Button>
              )}
              {status.connected && (
                <>
                  <Button
                    variant="secondary"
                    onClick={connect}
                    isLoading={acting}
                    disabled={acting}
                  >
                    Reconnect
                  </Button>
                  <Button
                    variant="danger"
                    onClick={disconnect}
                    isLoading={acting}
                    disabled={acting}
                  >
                    Disconnect
                  </Button>
                </>
              )}
            </div>

            {status.connected && status.product_sync && (
              <div className="flex flex-col gap-2 rounded border border-ui-border-base p-4">
                <Text size="small" weight="plus">
                  Product sync
                </Text>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge size="2xsmall" color="green">
                    {status.product_sync.synced} synced
                  </Badge>
                  <Badge
                    size="2xsmall"
                    color={status.product_sync.pending > 0 ? "orange" : "grey"}
                  >
                    {status.product_sync.pending} pending
                  </Badge>
                  <Badge
                    size="2xsmall"
                    color={
                      status.product_sync.failed_24h > 0 ? "red" : "grey"
                    }
                  >
                    {status.product_sync.failed_24h} failed/review (24h)
                  </Badge>
                </div>
                {status.product_sync.pending_list.length > 0 && (
                  <div className="text-xs text-ui-fg-subtle">
                    {status.product_sync.pending_list.map((r) => (
                      <div key={r.sku} className="flex justify-between gap-2">
                        <span className="truncate">{r.title}</span>
                        <span className="whitespace-nowrap">
                          {r.age_minutes} min
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {status.connected && (
              <div className="flex flex-col gap-3 rounded border border-ui-border-base p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Text size="small" className="text-ui-fg-subtle">
                    Live sync:
                  </Text>
                  <Badge
                    size="2xsmall"
                    color={status.sync_enabled ? "green" : "grey"}
                  >
                    {status.sync_enabled ? "ON" : "OFF"}
                  </Badge>
                  {!status.sync_enabled && (
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      Set QUICKBOOKS_SYNC_ENABLED=true on Railway to turn on live
                      sync.
                    </Text>
                  )}
                  <Text size="small" className="text-ui-fg-subtle ml-2">
                    Last successful sync:
                  </Text>
                  <Text size="small">
                    {formatDate(status.last_sync_at ?? null)}
                  </Text>
                </div>
                <div>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={resync}
                    isLoading={resyncing}
                    disabled={resyncing || acting}
                  >
                    Resync all to QuickBooks
                  </Button>
                </div>
              </div>
            )}

            {status.connected &&
              status.sync_log &&
              status.sync_log.length > 0 && (
                <div className="rounded border border-ui-border-base">
                  <div className="px-4 py-2 border-b border-ui-border-base">
                    <Text size="small" weight="plus">
                      Recent sync activity
                    </Text>
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-ui-border-base">
                    {status.sync_log.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between gap-3 px-4 py-2 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge
                            size="2xsmall"
                            color={
                              row.status === "success"
                                ? "green"
                                : row.status === "failed"
                                  ? "red"
                                  : "orange"
                            }
                          >
                            {row.status === "needs_manual_review"
                              ? "review"
                              : row.status}
                          </Badge>
                          <span className="text-ui-fg-subtle">
                            {row.direction === "medusa_to_qbo"
                              ? "→ QBO"
                              : "← QBO"}
                          </span>
                          <span className="truncate">{row.sku || "—"}</span>
                          {row.error_message && (
                            <span className="text-ui-fg-error truncate">
                              {row.error_message}
                            </span>
                          )}
                        </div>
                        <span className="text-ui-fg-muted whitespace-nowrap">
                          {formatDate(row.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "QuickBooks",
})

export default QuickbooksPage
