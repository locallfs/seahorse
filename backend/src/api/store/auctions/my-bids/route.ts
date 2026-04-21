import { Modules } from "@medusajs/utils"
import { AUCTIONS_MODULE } from "../../../../modules/auctions"

export async function GET(req: any, res: any) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }
  try {
    const auctionsModule: any = req.scope.resolve(AUCTIONS_MODULE)
    const productModule: any = req.scope.resolve(Modules.PRODUCT)

    const bids: any[] = await auctionsModule.listBids(
      { customer_id: customerId },
      { order: { created_at: "DESC" }, take: 500 }
    )

    const auctionIds = Array.from(
      new Set(bids.map((b: any) => b.auction_id).filter(Boolean))
    ) as string[]
    if (auctionIds.length === 0) {
      res.json({ auctions: [] })
      return
    }

    const auctions: any[] = await auctionsModule.listAuctions(
      { id: auctionIds },
      { relations: ["bids"] }
    )
    const productIds = Array.from(
      new Set(auctions.map((a: any) => a.product_id).filter(Boolean))
    ) as string[]
    const products: any[] = productIds.length
      ? await productModule.listProducts({ id: productIds })
      : []
    const productById = new Map(products.map((p: any) => [p.id, p]))

    const enriched = auctions
      .map((a: any) => {
        const myBids = (a.bids || []).filter(
          (b: any) => b.customer_id === customerId
        )
        const myHighest = myBids.reduce(
          (acc: any, b: any) =>
            !acc || b.amount > acc.amount ? b : acc,
          null as any
        )
        const currentHigh = (a.bids || []).find(
          (b: any) => b.status === "winning"
        )
        const currentHighAmount = currentHigh?.amount ?? null
        const p = productById.get(a.product_id)
        const isWinner = a.winner_customer_id === customerId
        return {
          id: a.id,
          status: a.status,
          starts_at: a.starts_at,
          ends_at: a.ends_at,
          winner_customer_id: a.winner_customer_id,
          winner_offer_status: a.winner_offer_status,
          winner_offer_expires_at: a.winner_offer_expires_at,
          current_high_bid_amount: currentHighAmount,
          is_current_high:
            !!currentHigh && currentHigh.customer_id === customerId,
          is_winner: isWinner,
          my_highest_bid: myHighest
            ? { amount: myHighest.amount, status: myHighest.status }
            : null,
          my_bid_count: myBids.length,
          product: p
            ? {
                id: p.id,
                title: p.title,
                thumbnail: p.thumbnail,
              }
            : null,
        }
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime()
      )

    res.json({ auctions: enriched })
  } catch (err: any) {
    console.error(`[store/auctions/my-bids] failed: ${err?.message || err}`)
    res.status(500).json({ error: err?.message || "Failed to load bids" })
  }
}
