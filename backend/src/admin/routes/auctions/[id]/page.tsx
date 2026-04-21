import {
  Badge,
  Button,
  Container,
  Heading,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

declare const __BACKEND_URL__: string | undefined

interface Bid {
  id: string
  amount: number
  status: string
  created_at: string
  customer_id: string
  bidder: {
    id: string
    email: string | null
    first_name: string | null
    last_name: string | null
  } | null
}

interface AuctionDetail {
  id: string
  status: string
  starts_at: string
  ends_at: string
  original_ends_at: string
  starting_bid: number
  bid_increment: number
  reserve_price: number | null
  reserve_met: boolean
  winner_customer_id: string | null
  winner_offer_status: string | null
  winner_offer_expires_at: string | null
  cascade_position: number
  metadata: Record<string, unknown> | null
  product: { id: string; title: string; thumbnail: string | null } | null
  bids: Bid[]
}

function formatCents(amount: number | null | undefined) {
  if (amount == null) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function bidderName(b: Bid) {
  if (!b.bidder) return b.customer_id
  const name = [b.bidder.first_name, b.bidder.last_name]
    .filter(Boolean)
    .join(" ")
  return name || b.bidder.email || b.customer_id
}

const AuctionDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const backendUrl = __BACKEND_URL__ ?? ""
  const [auction, setAuction] = useState<AuctionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${backendUrl}/admin/auctions/${id}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setAuction(data.auction)
    } catch (err: any) {
      toast.error(err?.message || "Failed to load auction")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    load()
  }, [id])

  const cancel = async () => {
    if (!auction) return
    if (!confirm("Cancel this auction? All bids will be discarded.")) return
    setCancelling(true)
    try {
      const res = await fetch(`${backendUrl}/admin/auctions/${auction.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("Auction cancelled")
      load()
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel")
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <Container className="p-6">
        <Text size="small" className="text-ui-fg-subtle">
          Loading…
        </Text>
      </Container>
    )
  }

  if (!auction) {
    return (
      <Container className="p-6">
        <Text>Auction not found.</Text>
        <Button
          variant="secondary"
          size="small"
          onClick={() => navigate("/auctions")}
          className="mt-3"
        >
          Back
        </Button>
      </Container>
    )
  }

  const current = (auction.metadata as any)?.current_high_bid_amount as
    | number
    | undefined
  const extended =
    new Date(auction.ends_at).getTime() !==
    new Date(auction.original_ends_at).getTime()
  const canCancel =
    auction.status === "scheduled" || auction.status === "live"

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="flex items-center gap-3">
            <Button
              variant="transparent"
              size="small"
              onClick={() => navigate("/auctions")}
            >
              ← Back
            </Button>
            <Heading level="h1">
              {auction.product?.title ?? "Auction"}
            </Heading>
            <Badge
              color={
                auction.status === "live"
                  ? "green"
                  : auction.status === "scheduled"
                  ? "blue"
                  : auction.status === "cancelled"
                  ? "red"
                  : "grey"
              }
              size="2xsmall"
            >
              {auction.status}
            </Badge>
          </div>
          <Text size="small" className="text-ui-fg-subtle">
            {auction.id}
          </Text>
        </div>
        {canCancel && (
          <Button
            variant="danger"
            size="small"
            isLoading={cancelling}
            onClick={cancel}
          >
            Cancel auction
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 px-6 py-4">
        <Field label="Starts" value={formatDate(auction.starts_at)} />
        <Field
          label="Ends"
          value={
            extended
              ? `${formatDate(auction.ends_at)} (extended from ${formatDate(
                  auction.original_ends_at
                )})`
              : formatDate(auction.ends_at)
          }
        />
        <Field
          label="Starting bid"
          value={formatCents(auction.starting_bid)}
        />
        <Field
          label="Current bid"
          value={formatCents(current ?? null)}
        />
        <Field
          label="Bid increment"
          value={formatCents(auction.bid_increment)}
        />
        <Field
          label="Reserve"
          value={
            auction.reserve_price != null
              ? `${formatCents(auction.reserve_price)} · ${
                  auction.reserve_met ? "met" : "not met"
                }`
              : "None"
          }
        />
        <Field
          label="Winner"
          value={auction.winner_customer_id || "—"}
        />
        <Field
          label="Winner offer"
          value={
            auction.winner_offer_status
              ? `${auction.winner_offer_status}${
                  auction.winner_offer_expires_at
                    ? ` · expires ${formatDate(auction.winner_offer_expires_at)}`
                    : ""
                }`
              : "—"
          }
        />
        <Field
          label="Cascade position"
          value={String(auction.cascade_position)}
        />
        <Field
          label="Total bids"
          value={String(auction.bids.length)}
        />
      </div>

      <div className="px-6 py-4">
        <Heading level="h2" className="mb-3">
          Bids
        </Heading>
        {auction.bids.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No bids yet.
          </Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Bidder</Table.HeaderCell>
                <Table.HeaderCell>Email</Table.HeaderCell>
                <Table.HeaderCell>Amount</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Placed</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {auction.bids.map((b) => (
                <Table.Row key={b.id}>
                  <Table.Cell>{bidderName(b)}</Table.Cell>
                  <Table.Cell>{b.bidder?.email ?? "—"}</Table.Cell>
                  <Table.Cell>{formatCents(b.amount)}</Table.Cell>
                  <Table.Cell>
                    <Badge
                      color={
                        b.status === "winning"
                          ? "green"
                          : b.status === "forfeited"
                          ? "red"
                          : "grey"
                      }
                      size="2xsmall"
                    >
                      {b.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{formatDate(b.created_at)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  )
}

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <Text size="xsmall" className="text-ui-fg-subtle uppercase tracking-wider">
      {label}
    </Text>
    <Text>{value}</Text>
  </div>
)

export default AuctionDetailPage
