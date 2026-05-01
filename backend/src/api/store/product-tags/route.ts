import { Modules } from "@medusajs/utils"

export async function GET(req: any, res: any) {
  console.log("[store/product-tags] list requested")
  try {
    const productModule: any = req.scope.resolve(Modules.PRODUCT)
    const tags = await productModule.listProductTags(
      {},
      { take: 1000, select: ["id", "value"] },
    )
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300")
    res.json({
      product_tags: tags.map((t: any) => ({ id: t.id, value: t.value })),
    })
  } catch (err: any) {
    console.error(`[store/product-tags] error: ${err?.message || err}`)
    res.status(500).json({ error: err?.message || "Failed to list tags" })
  }
}
