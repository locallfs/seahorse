import { MedusaService } from "@medusajs/utils"
import { Auction } from "./models/auction"
import { Bid } from "./models/bid"

const SOFT_CLOSE_WINDOW_MS = 2 * 60 * 1000

class AuctionsModuleService extends MedusaService({
  Auction,
  Bid,
}) {
  async createAuction(input: {
    product_id: string
    starts_at: Date
    ends_at: Date
    starting_bid: number
    bid_increment?: number
    reserve_price?: number | null
    metadata?: Record<string, unknown>
  }) {
    const now = Date.now()
    const starts = input.starts_at.getTime()
    const ends = input.ends_at.getTime()
    if (ends <= starts) {
      throw new Error("ends_at must be after starts_at")
    }
    if (input.starting_bid < 0) {
      throw new Error("starting_bid must be >= 0")
    }
    if ((input.bid_increment ?? 500) <= 0) {
      throw new Error("bid_increment must be > 0")
    }

    const status = starts <= now ? "live" : "scheduled"

    const [created] = await this.createAuctions([
      {
        product_id: input.product_id,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        original_ends_at: input.ends_at,
        starting_bid: input.starting_bid,
        bid_increment: input.bid_increment ?? 500,
        reserve_price: input.reserve_price ?? null,
        status,
        metadata: input.metadata ?? null,
      },
    ])
    return created
  }

  async cancelAuction(id: string) {
    await this.updateAuctions({ id, status: "cancelled" })
    return await this.retrieveAuction(id)
  }

  async extendIfSoftClose(auctionId: string, bidPlacedAt: Date = new Date()) {
    const auction = await this.retrieveAuction(auctionId)
    if (auction.status !== "live") return auction
    const endsMs = new Date(auction.ends_at).getTime()
    const nowMs = bidPlacedAt.getTime()
    if (endsMs - nowMs >= SOFT_CLOSE_WINDOW_MS) return auction
    const extended = new Date(nowMs + SOFT_CLOSE_WINDOW_MS)
    await this.updateAuctions({ id: auctionId, ends_at: extended })
    return await this.retrieveAuction(auctionId)
  }
}

export default AuctionsModuleService
