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
    const [auction] = await auctionsModule.listAuctions(
      { id: auctionId },
      { relations: ["bids"] }
    )
    if (!auction) {
      res.status(404).json({ error: "Auction not found" })
      return
    }
    res.json({ auction })
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
