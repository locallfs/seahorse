import crypto from "crypto"
import { Modules } from "@medusajs/utils"
import { AUCTIONS_MODULE } from "../../../../modules/auctions"

function anonymize(auctionId: string, customerId: string): string {
  const h = crypto
    .createHash("sha256")
    .update(`${auctionId}:${customerId}`)
    .digest("hex")
  return `bidder_${h.slice(0, 4)}`
}

export async function GET(req: any, res: any) {
  const auctionId = req.params?.id
  if (!auctionId) {
    res.status(400).json({ error: "Missing auction id" })
    return
  }
  try {
    const auctionsModule: any = req.scope.resolve(AUCTIONS_MODULE)
    const productModule: any = req.scope.resolve(Modules.PRODUCT)

    const [auction] = await auctionsModule.listAuctions(
      { id: auctionId },
      { relations: ["bids"] }
    )
    if (!auction) {
      res.status(404).json({ error: "Auction not found" })
      return
    }

    const [product] = await productModule.listProducts(
      { id: auction.product_id },
      { relations: ["images", "variants"] }
    )

    const bids = (auction.bids || [])
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .map((b: any) => ({
        id: b.id,
        amount: b.amount,
        status: b.status,
        created_at: b.created_at,
        bidder: anonymize(auction.id, b.customer_id),
      }))

    const currentHighBid =
      bids.find((b: any) => b.status === "winning") ||
      bids.find((b: any) => b.status === "active") ||
      null

    const currentCustomerId = req.auth_context?.actor_id || null
    const viewerBid = currentCustomerId
      ? (auction.bids || [])
          .filter((b: any) => b.customer_id === currentCustomerId)
          .sort((a: any, b: any) => b.amount - a.amount)[0]
      : null

    res.json({
      auction: {
        id: auction.id,
        status: auction.status,
        starts_at: auction.starts_at,
        ends_at: auction.ends_at,
        original_ends_at: auction.original_ends_at,
        starting_bid: auction.starting_bid,
        bid_increment: auction.bid_increment,
        current_high_bid: currentHighBid,
        min_next_bid: currentHighBid
          ? currentHighBid.amount + auction.bid_increment
          : auction.starting_bid,
        viewer_bid: viewerBid
          ? { amount: viewerBid.amount, status: viewerBid.status }
          : null,
        bids,
        product: product
          ? {
              id: product.id,
              handle: product.handle,
              title: product.title,
              description: product.description,
              thumbnail: product.thumbnail,
              images: product.images?.map((i: any) => ({ url: i.url })) ?? [],
            }
          : null,
      },
    })
  } catch (err: any) {
    console.error(`[store/auctions/:id] get failed: ${err?.message || err}`)
    res.status(500).json({ error: err?.message || "Failed to fetch auction" })
  }
}
