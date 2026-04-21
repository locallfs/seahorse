import { Modules } from "@medusajs/utils"
import { AUCTIONS_MODULE } from "../../../modules/auctions"

export async function GET(req: any, res: any) {
  console.log("[store/auctions] list requested")
  try {
    const auctionsModule: any = req.scope.resolve(AUCTIONS_MODULE)
    const productModule: any = req.scope.resolve(Modules.PRODUCT)

    const filters: Record<string, unknown> = {
      status: ["scheduled", "live"],
    }
    const auctions = await auctionsModule.listAuctions(filters, {
      order: { ends_at: "ASC" },
      take: 100,
    })

    const productIds = Array.from(
      new Set(auctions.map((a: any) => a.product_id).filter(Boolean))
    )
    const products: any[] = productIds.length
      ? await productModule.listProducts(
          { id: productIds as string[] },
          { relations: ["images"] }
        )
      : []
    const byId = new Map(products.map((p) => [p.id, p]))

    const payload = auctions.map((a: any) => {
      const product = byId.get(a.product_id)
      return {
        id: a.id,
        status: a.status,
        starts_at: a.starts_at,
        ends_at: a.ends_at,
        starting_bid: a.starting_bid,
        bid_increment: a.bid_increment,
        current_high_bid_amount: a.metadata?.current_high_bid_amount ?? null,
        product: product
          ? {
              id: product.id,
              handle: product.handle,
              title: product.title,
              thumbnail: product.thumbnail,
              images: product.images?.map((i: any) => ({ url: i.url })) ?? [],
            }
          : null,
      }
    })

    res.json({ auctions: payload })
  } catch (err: any) {
    console.error(`[store/auctions] list failed: ${err?.message || err}`)
    res.status(500).json({ error: err?.message || "Failed to list auctions" })
  }
}
