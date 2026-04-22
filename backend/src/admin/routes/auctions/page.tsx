import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

declare const __BACKEND_URL__: string | undefined

interface Auction {
  id: string
  status: string
  starts_at: string
  ends_at: string
  starting_bid: number
  bid_increment: number
  reserve_price: number | null
  reserve_met: boolean
  winner_customer_id: string | null
  winner_offer_status: string | null
  cascade_position: number
  metadata: Record<string, unknown> | null
  product: { id: string; title: string; thumbnail: string | null } | null
}

interface ProductSlim {
  id: string
  title: string
  thumbnail: string | null
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
    hour: "numeric",
    minute: "2-digit",
  })
}

function statusColor(status: string): "grey" | "blue" | "green" | "red" | "orange" {
  switch (status) {
    case "live":
      return "green"
    case "scheduled":
      return "blue"
    case "ended":
      return "grey"
    case "cancelled":
      return "red"
    case "relisted":
      return "orange"
    default:
      return "grey"
  }
}

const AuctionsListPage = () => {
  const backendUrl = __BACKEND_URL__ ?? ""
  const navigate = useNavigate()
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCreate, setShowCreate] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const url =
        statusFilter === "all"
          ? `${backendUrl}/admin/auctions`
          : `${backendUrl}/admin/auctions?status=${encodeURIComponent(statusFilter)}`
      const res = await fetch(url, { credentials: "include" })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setAuctions(data.auctions || [])
    } catch (err: any) {
      toast.error(err?.message || "Failed to load auctions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [statusFilter])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Auctions</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Manage live, scheduled, and ended auctions.
          </Text>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <Select.Trigger className="w-40">
              <Select.Value placeholder="All statuses" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All statuses</Select.Item>
              <Select.Item value="scheduled">Scheduled</Select.Item>
              <Select.Item value="live">Live</Select.Item>
              <Select.Item value="ended">Ended</Select.Item>
              <Select.Item value="cancelled">Cancelled</Select.Item>
            </Select.Content>
          </Select>
          <Button size="small" onClick={() => setShowCreate(true)}>
            New auction
          </Button>
        </div>
      </div>

      {showCreate && (
        <CreateAuctionForm
          backendUrl={backendUrl}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            load()
          }}
        />
      )}

      <div className="px-6 py-4">
        {loading ? (
          <Text size="small" className="text-ui-fg-subtle">
            Loading…
          </Text>
        ) : auctions.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No auctions yet.
          </Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Product</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Starts</Table.HeaderCell>
                <Table.HeaderCell>Ends</Table.HeaderCell>
                <Table.HeaderCell>Start bid</Table.HeaderCell>
                <Table.HeaderCell>Current</Table.HeaderCell>
                <Table.HeaderCell>Reserve</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {auctions.map((a) => {
                const current = (a.metadata as any)?.current_high_bid_amount as
                  | number
                  | undefined
                return (
                  <Table.Row
                    key={a.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/auctions/${a.id}`)}
                  >
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        {a.product?.thumbnail && (
                          <img
                            src={a.product.thumbnail}
                            alt=""
                            className="w-8 h-8 object-cover rounded"
                          />
                        )}
                        <Text size="small">
                          {a.product?.title ?? "—"}
                        </Text>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={statusColor(a.status)} size="2xsmall">
                        {a.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>{formatDate(a.starts_at)}</Table.Cell>
                    <Table.Cell>{formatDate(a.ends_at)}</Table.Cell>
                    <Table.Cell>{formatCents(a.starting_bid)}</Table.Cell>
                    <Table.Cell>{formatCents(current ?? null)}</Table.Cell>
                    <Table.Cell>
                      {a.reserve_price != null
                        ? `${formatCents(a.reserve_price)}${
                            a.reserve_met ? " ✓" : ""
                          }`
                        : "—"}
                    </Table.Cell>
                    <Table.Cell>
                      <Link
                        to={`/auctions/${a.id}`}
                        className="text-ui-fg-interactive"
                      >
                        View
                      </Link>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  )
}

const CreateAuctionForm = ({
  backendUrl,
  onClose,
  onCreated,
}: {
  backendUrl: string
  onClose: () => void
  onCreated: () => void
}) => {
  const [query, setQuery] = useState("")
  const [products, setProducts] = useState<ProductSlim[]>([])
  const [productId, setProductId] = useState("")
  const [startsAt, setStartsAt] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() + 5)
    return toLocalInput(d)
  })
  const [endsAt, setEndsAt] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    return toLocalInput(d)
  })
  const [startingBid, setStartingBid] = useState("")
  const [bidIncrement, setBidIncrement] = useState("5")
  const [reservePrice, setReservePrice] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const h = setTimeout(async () => {
      if (!query.trim()) {
        setProducts([])
        return
      }
      try {
        const res = await fetch(
          `${backendUrl}/admin/products?q=${encodeURIComponent(query)}&limit=10`,
          { credentials: "include" }
        )
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        setProducts(
          (data.products || []).map((p: any) => ({
            id: p.id,
            title: p.title,
            thumbnail: p.thumbnail,
          }))
        )
      } catch (err: any) {
        toast.error(err?.message || "Product search failed")
      }
    }, 250)
    return () => clearTimeout(h)
  }, [query, backendUrl])

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  )

  const submit = async () => {
    if (!productId) {
      toast.error("Pick a product")
      return
    }
    const startCents = Math.round(Number(startingBid) * 100)
    if (!Number.isFinite(startCents) || startCents < 0) {
      toast.error("Enter a valid starting bid")
      return
    }
    const incrementCents = Math.round(Number(bidIncrement) * 100)
    const reserveCents = reservePrice
      ? Math.round(Number(reservePrice) * 100)
      : null

    setSubmitting(true)
    try {
      const res = await fetch(`${backendUrl}/admin/auctions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
          starting_bid: startCents,
          bid_increment: incrementCents,
          reserve_price: reserveCents,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || "Create failed")
      }
      toast.success("Auction created")
      onCreated()
    } catch (err: any) {
      toast.error(err?.message || "Failed to create auction")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-5 bg-ui-bg-subtle">
      <div className="flex items-center justify-between">
        <Heading level="h2">Create auction</Heading>
        <Button variant="secondary" size="small" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <Label size="xsmall" weight="plus">
          Product
        </Label>
        {selectedProduct ? (
          <div className="flex items-center justify-between border rounded px-3 py-2">
            <div className="flex items-center gap-2">
              {selectedProduct.thumbnail && (
                <img
                  src={selectedProduct.thumbnail}
                  alt=""
                  className="w-8 h-8 object-cover rounded"
                />
              )}
              <Text>{selectedProduct.title}</Text>
            </div>
            <Button
              variant="transparent"
              size="small"
              onClick={() => setProductId("")}
            >
              Change
            </Button>
          </div>
        ) : (
          <>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
            />
            {products.length > 0 && (
              <div className="border rounded divide-y max-h-48 overflow-y-auto bg-ui-bg-base">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProductId(p.id)
                      setQuery("")
                    }}
                    className="flex items-center gap-2 px-3 py-2 w-full hover:bg-ui-bg-base-hover text-left"
                  >
                    {p.thumbnail && (
                      <img
                        src={p.thumbnail}
                        alt=""
                        className="w-8 h-8 object-cover rounded"
                      />
                    )}
                    <Text>{p.title}</Text>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label size="xsmall" weight="plus">
            Starts at
          </Label>
          <Input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label size="xsmall" weight="plus">
            Ends at
          </Label>
          <Input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label size="xsmall" weight="plus">
            Starting bid ($)
          </Label>
          <Input
            type="number"
            step="1"
            min="0"
            value={startingBid}
            onChange={(e) => setStartingBid(e.target.value)}
            placeholder="25"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label size="xsmall" weight="plus">
            Bid increment ($)
          </Label>
          <Input
            type="number"
            step="1"
            min="1"
            value={bidIncrement}
            onChange={(e) => setBidIncrement(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1 col-span-2">
          <Label size="xsmall" weight="plus">
            Reserve price ($, optional — hidden from bidders)
          </Label>
          <Input
            type="number"
            step="1"
            min="0"
            value={reservePrice}
            onChange={(e) => setReservePrice(e.target.value)}
            placeholder="Leave blank for no reserve"
          />
        </div>
      </div>
      <div>
        <Button onClick={submit} isLoading={submitting}>
          Create auction
        </Button>
      </div>
    </div>
  )
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

// Auctions hidden from admin sidebar on 2026-04-21.
// To restore: uncomment the block below. Route /admin/auctions still works by URL.
// export const config = defineRouteConfig({
//   label: "Auctions",
// })

export default AuctionsListPage
