import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminCustomer } from "@medusajs/types"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

declare const __BACKEND_URL__: string | undefined

interface Status {
  ghost_count: number
  last_ghost_at: string | null
  banned: boolean
  banned_at: string | null
}

const CustomerAuctionStatusWidget = ({
  data,
}: DetailWidgetProps<AdminCustomer>) => {
  const backendUrl = __BACKEND_URL__ ?? ""
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${backendUrl}/admin/customers/${data.id}/auction-status`,
        { credentials: "include" }
      )
      if (!res.ok) throw new Error(await res.text())
      setStatus(await res.json())
    } catch (err: any) {
      toast.error(err?.message || "Failed to load auction status")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [data.id])

  const update = async (payload: {
    banned?: boolean
    reset_ghost_count?: boolean
  }) => {
    setActing(true)
    try {
      const res = await fetch(
        `${backendUrl}/admin/customers/${data.id}/auction-status`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) throw new Error(await res.text())
      setStatus(await res.json())
      toast.success("Updated")
    } catch (err: any) {
      toast.error(err?.message || "Update failed")
    } finally {
      setActing(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Auction status</Heading>
        {status && (
          <Badge
            color={status.banned ? "red" : status.ghost_count > 0 ? "orange" : "green"}
            size="2xsmall"
          >
            {status.banned
              ? "Banned"
              : status.ghost_count > 0
              ? `${status.ghost_count} ghost${status.ghost_count > 1 ? "s" : ""}`
              : "Clean"}
          </Badge>
        )}
      </div>
      <div className="flex flex-col gap-3 px-6 py-4">
        {loading || !status ? (
          <Text size="small" className="text-ui-fg-subtle">
            Loading…
          </Text>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Text
                  size="xsmall"
                  className="text-ui-fg-subtle uppercase tracking-wider"
                >
                  Ghost count
                </Text>
                <Text>{status.ghost_count}</Text>
              </div>
              <div>
                <Text
                  size="xsmall"
                  className="text-ui-fg-subtle uppercase tracking-wider"
                >
                  Last ghost
                </Text>
                <Text>
                  {status.last_ghost_at
                    ? new Date(status.last_ghost_at).toLocaleString()
                    : "—"}
                </Text>
              </div>
              <div>
                <Text
                  size="xsmall"
                  className="text-ui-fg-subtle uppercase tracking-wider"
                >
                  Ban status
                </Text>
                <Text>{status.banned ? "Banned from bidding" : "Can bid"}</Text>
              </div>
              <div>
                <Text
                  size="xsmall"
                  className="text-ui-fg-subtle uppercase tracking-wider"
                >
                  Banned at
                </Text>
                <Text>
                  {status.banned_at
                    ? new Date(status.banned_at).toLocaleString()
                    : "—"}
                </Text>
              </div>
            </div>
            <div className="flex gap-2">
              {status.banned ? (
                <Button
                  variant="secondary"
                  size="small"
                  isLoading={acting}
                  onClick={() => update({ banned: false })}
                >
                  Unban
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="small"
                  isLoading={acting}
                  onClick={() => update({ banned: true })}
                >
                  Ban from auctions
                </Button>
              )}
              {status.ghost_count > 0 && (
                <Button
                  variant="secondary"
                  size="small"
                  isLoading={acting}
                  onClick={() => update({ reset_ghost_count: true })}
                >
                  Reset ghost count
                </Button>
              )}
            </div>
            <Text size="small" className="text-ui-fg-subtle">
              Ghost = won an auction but did not pay within 24 hours. 2nd ghost
              auto-bans the customer from bidding.
            </Text>
          </>
        )}
      </div>
    </Container>
  )
}

// Auctions hidden from admin on 2026-04-21.
// Without a config export, Medusa does not mount this widget on customer pages.
// To restore: uncomment the block below.
// export const config = defineWidgetConfig({
//   zone: "customer.details.after",
// })

export default CustomerAuctionStatusWidget
