import { Modules } from "@medusajs/utils"
import { AUCTIONS_MODULE } from "../../../../modules/auctions"

export async function GET(req: any, res: any) {
  const auctionId = req.params?.id
  console.log(`[admin/auctions/:id] get ${auctionId}`)
  if (!auctionId) {
    res.status(400).json({ error: "Missing auction id" })
    return
  }
  try {
    const auctionsModule: any = req.scope.resolve(AUCTIONS_MODULE)
    const productModule: any = req.scope.resolve(Modules.PRODUCT)
    const customerModule: any = req.scope.resolve(Modules.CUSTOMER)

    const [auction] = await auctionsModule.listAuctions(
      { id: auctionId },
      { relations: ["bids"] }
    )
    if (!auction) {
      res.status(404).json({ error: "Auction not found" })
      return
    }

    const [product] = auction.product_id
      ? await productModule.listProducts({ id: auction.product_id })
      : [null]

    const bidderIds = Array.from(
      new Set((auction.bids || []).map((b: any) => b.customer_id).filter(Boolean))
    ) as string[]
    let customerById = new Map<string, any>()
    if (bidderIds.length) {
      const customers = await customerModule.listCustomers({ id: bidderIds })
      customerById = new Map(customers.map((c: any) => [c.id, c]))
    }

    res.json({
      auction: {
        ...auction,
        product: product
          ? { id: product.id, title: product.title, thumbnail: product.thumbnail }
          : null,
        bids: (auction.bids || [])
          .slice()
          .sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .map((b: any) => {
            const c = customerById.get(b.customer_id)
            return {
              ...b,
              bidder: c
                ? {
                    id: c.id,
                    email: c.email,
                    first_name: c.first_name,
                    last_name: c.last_name,
                  }
                : null,
            }
          }),
      },
    })
  } catch (err: any) {
    console.error(`[admin/auctions/:id] get failed: ${err?.message || err}`)
    res.status(500).json({ error: err?.message || "Failed to fetch auction" })
  }
}

export async function POST(req: any, res: any) {
  const auctionId = req.params?.id
  console.log(`[admin/auctions/:id] update ${auctionId}`)
  if (!auctionId) {
    res.status(400).json({ error: "Missing auction id" })
    return
  }
  try {
    const auctionsModule: any = req.scope.resolve(AUCTIONS_MODULE)
    const allowed = [
      "starts_at",
      "ends_at",
      "starting_bid",
      "bid_increment",
      "reserve_price",
      "metadata",
      "status",
    ]
    const payload: Record<string, unknown> = { id: auctionId }
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) {
        if (key === "starts_at" || key === "ends_at") {
          payload[key] = new Date(req.body[key])
        } else {
          payload[key] = req.body[key]
        }
      }
    }
    await auctionsModule.updateAuctions(payload)
    const updated = await auctionsModule.retrieveAuction(auctionId)
    res.json({ auction: updated })
  } catch (err: any) {
    console.error(`[admin/auctions/:id] update failed: ${err?.message || err}`)
    res.status(500).json({ error: err?.message || "Failed to update auction" })
  }
}

export async function DELETE(req: any, res: any) {
  const auctionId = req.params?.id
  console.log(`[admin/auctions/:id] cancel ${auctionId}`)
  if (!auctionId) {
    res.status(400).json({ error: "Missing auction id" })
    return
  }
  try {
    const auctionsModule: any = req.scope.resolve(AUCTIONS_MODULE)
    const cancelled = await auctionsModule.cancelAuction(auctionId)
    res.json({ auction: cancelled })
  } catch (err: any) {
    console.error(`[admin/auctions/:id] cancel failed: ${err?.message || err}`)
    res.status(500).json({ error: err?.message || "Failed to cancel auction" })
  }
}
