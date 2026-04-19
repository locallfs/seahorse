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

interface StatusPayload {
  configured: boolean
  connected: boolean
  connection: Connection | null
  environment: string
}

const QuickbooksPage = () => {
  const backendUrl = __BACKEND_URL__ ?? ""
  const [status, setStatus] = useState<StatusPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const loadStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${backendUrl}/admin/quickbooks`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as StatusPayload
      setStatus(data)
    } catch (err: any) {
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
        const msg = (await res.json().catch(() => ({}))).error || "Failed to start OAuth"
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
    if (!confirm("Disconnect QuickBooks? Sync will stop until reconnected.")) return
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
            Sync inventory between Medusa and QuickBooks.
          </Text>
        </div>
        {status?.connected ? (
          <StatusBadge color="green">Connected</StatusBadge>
        ) : (
          <StatusBadge color="grey">Not connected</StatusBadge>
        )}
      </div>

      <div className="flex flex-col gap-4 px-6 py-6">
        {loading && <Text size="small">Loading…</Text>}

        {!loading && status && !status.configured && (
          <div className="rounded border border-ui-border-error bg-ui-bg-base p-4">
            <Text className="text-ui-fg-error">
              Backend is missing one or more QuickBooks env vars:
              QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET, QUICKBOOKS_REDIRECT_URI.
              Set them on Railway, redeploy, then return here.
            </Text>
          </div>
        )}

        {!loading && status && status.configured && (
          <>
            <div className="flex items-center gap-2">
              <Text size="small" className="text-ui-fg-subtle">Environment:</Text>
              <Badge size="2xsmall" color={status.environment === "production" ? "green" : "orange"}>
                {status.environment}
              </Badge>
            </div>

            {status.connected && status.connection && (
              <div className="grid grid-cols-2 gap-4 rounded border border-ui-border-base p-4">
                <div>
                  <Text size="xsmall" className="text-ui-fg-subtle">Realm (Company) ID</Text>
                  <Text size="small">{status.connection.realm_id}</Text>
                </div>
                <div>
                  <Text size="xsmall" className="text-ui-fg-subtle">Access token expires</Text>
                  <Text size="small">{formatDate(status.connection.access_token_expires_at)}</Text>
                </div>
                <div>
                  <Text size="xsmall" className="text-ui-fg-subtle">Refresh token expires</Text>
                  <Text size="small">{formatDate(status.connection.refresh_token_expires_at)}</Text>
                </div>
                {status.connection.last_error && (
                  <div className="col-span-2">
                    <Text size="xsmall" className="text-ui-fg-subtle">Last error</Text>
                    <Text size="small" className="text-ui-fg-error">
                      {status.connection.last_error}
                    </Text>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {!status.connected && (
                <Button variant="primary" onClick={connect} isLoading={acting} disabled={acting}>
                  Connect to QuickBooks
                </Button>
              )}
              {status.connected && (
                <>
                  <Button variant="secondary" onClick={connect} isLoading={acting} disabled={acting}>
                    Reconnect
                  </Button>
                  <Button variant="danger" onClick={disconnect} isLoading={acting} disabled={acting}>
                    Disconnect
                  </Button>
                </>
              )}
            </div>
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
