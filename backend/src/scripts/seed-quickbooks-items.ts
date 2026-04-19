import { ExecArgs, IProductModuleService } from "@medusajs/types"
import { Modules } from "@medusajs/utils"
import { QUICKBOOKS_MODULE } from "../modules/quickbooks"
import type QuickbooksModuleService from "../modules/quickbooks/service"
import {
  findDefaultIncomeAccount,
  findItemBySku,
  createNonInventoryItem,
} from "../modules/quickbooks/items"

export default async function seedQuickbooksItems({ container }: ExecArgs) {
  const productModule: IProductModuleService = container.resolve(Modules.PRODUCT)
  const qb = container.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService

  console.log("Looking up default QuickBooks Sales Income account…")
  const { incomeAccountId } = await findDefaultIncomeAccount(qb)
  console.log(`  Using IncomeAccountRef: ${incomeAccountId}`)

  console.log("Loading Medusa products…")
  const products = await productModule.listProducts(
    {},
    { relations: ["variants"], take: null }
  )
  console.log(`  Found ${products.length} products`)

  let created = 0
  let existed = 0
  let skipped = 0
  let failed = 0

  for (const product of products) {
    const variants = product.variants ?? []
    for (const variant of variants) {
      const sku = (variant.sku || "").trim()
      if (!sku) {
        skipped++
        continue
      }

      const variantTitle = variant.title && variant.title !== "Default variant"
        ? variant.title
        : null
      const name = variantTitle
        ? `${product.title} — ${variantTitle}`
        : product.title

      try {
        const existing = await findItemBySku(qb, sku)
        if (existing) {
          existed++
          continue
        }
        await createNonInventoryItem(qb, {
          name,
          sku,
          description: product.description ?? undefined,
          incomeAccountId,
        })
        created++
        if (created % 25 === 0) {
          console.log(`  Created ${created} so far (existed ${existed}, failed ${failed})…`)
        }
      } catch (err: any) {
        failed++
        console.error(`  FAIL ${sku}: ${err?.message?.slice(0, 200)}`)
        await qb.recordError(`Seed failed for ${sku}: ${err?.message}`).catch(() => {})
      }
    }
  }

  console.log("")
  console.log("Seed complete:")
  console.log(`  Created in QBO:  ${created}`)
  console.log(`  Already existed: ${existed}`)
  console.log(`  Skipped (no SKU): ${skipped}`)
  console.log(`  Failed:          ${failed}`)
}
