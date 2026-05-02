import { ExecArgs, IProductModuleService } from "@medusajs/types"
import { Modules } from "@medusajs/utils"
import { buildVariantSku } from "../lib/sku"

export default async function assignSkus({ container }: ExecArgs) {
  const productModule: IProductModuleService = container.resolve(Modules.PRODUCT)

  const products = await productModule.listProducts(
    {},
    { relations: ["variants"], take: null }
  )

  console.log(`Found ${products.length} products. Scanning variants...`)

  const taken = new Set<string>()
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (variant.sku && variant.sku.trim().length > 0) {
        taken.add(variant.sku.trim())
      }
    }
  }

  let updated = 0
  let skipped = 0

  for (const product of products) {
    const variants = product.variants ?? []
    if (variants.length === 0) continue

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i]
      if (variant.sku && variant.sku.trim().length > 0) {
        skipped++
        continue
      }
      const sku = buildVariantSku(
        product.title,
        product.handle ?? null,
        i,
        variants.length,
        taken,
      )
      await productModule.updateProductVariants(variant.id, { sku })
      console.log(`  ${product.title.slice(0, 40).padEnd(40)} \u2192 ${sku}`)
      updated++
    }
  }

  console.log(
    `\nDone. Assigned ${updated} new SKUs, left ${skipped} existing SKUs untouched.`
  )
}
