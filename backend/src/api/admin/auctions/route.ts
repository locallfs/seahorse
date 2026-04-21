import { Modules } from "@medusajs/utils"
import { AUCTIONS_MODULE } from "../../../modules/auctions"

export async function GET(req: any, res: any) {
  console.log("[admin/auctions] list requested")
  try {
    const auctionsModule: any = req.scope.resolve(AUCTIONS_MODULE)
    const productModule: any = req.scope.resolve(Modules.PRODUCT)
    const status = req.query?.status
    const filters: Record<string, unknown> = {}
    if (typeof status === "string" && status.length > 0) {
      filters.status = status
    }
    const auctions = await auctionsModule.listAuctions(filters, {
      order: { created_at: "DESC" },
      take: 200,
    })

    const productIds = Array.from(
      new Set(auctions.map((a: any) => a.product_id).filter(Boolean))
    ) as string[]
    let productById = new Map<string, any>()
    if (productIds.length) {
      const products = await productModule.listProducts({ id: productIds })
      productById = new Map(products.map((p: any) => [p.id, p]))
    }

    res.json({
      auctions: auctions.map((a: any) => {
        const p = productById.get(a.product_id)
        return {
          ...a,
          product: p
            ? { id: p.id, title: p.title, thumbnail: p.thumbnail }
            : null,
        }
      }),
    })
  } catch (err: any) {
    console.error(`[admin/auctions] list failed: ${err?.message || err}`)
    res.status(500).json({ error: err?.message || "Failed to list auctions" })
  }
}

export async function POST(req: any, res: any) {
  console.log("[admin/auctions] create requested")
  try {
    const {
      product_id,
      starts_at,
      ends_at,
      starting_bid,
      bid_increment,
      reserve_price,
      metadata,
    } = req.body ?? {}

    if (!product_id || !starts_at || !ends_at || starting_bid == null) {
      res.status(400).json({
        error:
          "product_id, starts_at, ends_at, and starting_bid are required",
      })
      return
    }

    const auctionsModule: any = req.scope.resolve(AUCTIONS_MODULE)
    const created = await auctionsModule.createAuction({
      product_id,
      starts_at: new Date(starts_at),
      ends_at: new Date(ends_at),
      starting_bid: Number(starting_bid),
      bid_increment:
        bid_increment != null ? Number(bid_increment) : undefined,
      reserve_price:
        reserve_price != null ? Number(reserve_price) : null,
      metadata: metadata ?? null,
    })

    console.log(`[admin/auctions] created ${created.id}`)
    res.status(201).json({ auction: created })
  } catch (err: any) {
    console.error(`[admin/auctions] create failed: ${err?.message || err}`)
    res.status(500).json({ error: err?.message || "Failed to create auction" })
  }
}
