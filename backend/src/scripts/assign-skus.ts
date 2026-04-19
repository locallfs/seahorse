import { ExecArgs, IProductModuleService } from "@medusajs/types"
import { Modules } from "@medusajs/utils"

const PREFIX = "WS-"

function slugifySku(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

function buildSkuBase(productTitle: string, productHandle: string | null): string {
  const source = productHandle && productHandle.trim().length > 0
    ? productHandle
    : productTitle
  const slug = slugifySku(source)
  return slug.length > 0 ? `${PREFIX}${slug}` : `${PREFIX}ITEM`
}

export default async function assignSkus({ container }: ExecArgs) {
  const productModule: IProductModuleService = container.resolve(Modules.PRODUCT)

  const products = await productModule.listProducts(
    {},
    { relations: ["variants"], take: null }
  )

  console.log(`Found ${products.length} products. Scanning variants...`)

  const existingSkus = new Set<string>()
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (variant.sku && variant.sku.trim().length > 0) {
        existingSkus.add(variant.sku.trim())
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

      const base = buildSkuBase(product.title, product.handle ?? null)
      const suffix = variants.length > 1 ? `-V${String(i + 1).padStart(2, "0")}` : ""
      let candidate = `${base}${suffix}`
      let n = 1
      while (existingSkus.has(candidate)) {
        n++
        candidate = `${base}${suffix}-${String(n).padStart(2, "0")}`
      }
      existingSkus.add(candidate)

      await productModule.updateProductVariants(variant.id, { sku: candidate })
      console.log(`  ${product.title.slice(0, 40).padEnd(40)} \u2192 ${candidate}`)
      updated++
    }
  }

  console.log(
    `\nDone. Assigned ${updated} new SKUs, left ${skipped} existing SKUs untouched.`
  )
}
