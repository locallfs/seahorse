/* eslint-disable @typescript-eslint/no-explicit-any */
import { ExecArgs } from "@medusajs/types"
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { QUICKBOOKS_MODULE } from "../modules/quickbooks"
import type QuickbooksModuleService from "../modules/quickbooks/service"
import {
  findInventoryAccounts,
  findItemBySku,
  createInventoryItem,
} from "../modules/quickbooks/items"
import { resolveItemKey, variantOnHand } from "../modules/quickbooks/mapping"

// Idempotent: creates a QBO Inventory item (with its current Medusa on-hand as
// the starting quantity) for every variant that doesn't already have one,
// keyed by UPC → barcode → SKU. Safe to re-run.
export default async function seedQuickbooksItems({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const qb = container.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService

  console.log("Looking up QuickBooks inventory accounts…")
  const accounts = await findInventoryAccounts(qb)
  console.log(
    `  income=${accounts.incomeAccountId} asset=${accounts.assetAccountId} cogs=${accounts.cogsAccountId}`
  )

  const invStartDate = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  console.log("Loading Medusa products + stock…")
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "description",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.upc",
      "variants.barcode",
      "variants.inventory_items.inventory.location_levels.stocked_quantity",
    ],
  })
  console.log(`  Found ${products.length} products`)

  let created = 0
  let existed = 0
  let skipped = 0
  let failed = 0

  for (const product of products as any[]) {
    for (const variant of product.variants || []) {
      const key = resolveItemKey(variant)
      if (!key) {
        skipped++
        continue
      }

      const variantTitle =
        variant.title && variant.title !== "Default variant"
          ? variant.title
          : null
      const name = variantTitle
        ? `${product.title} — ${variantTitle}`
        : product.title
      const qty = variantOnHand(variant)

      try {
        const existing = await findItemBySku(qb, key)
        if (existing) {
          existed++
          continue
        }
        await createInventoryItem(qb, {
          name,
          sku: key,
          qtyOnHand: qty,
          description: product.description ?? undefined,
          accounts,
          invStartDate,
        })
        created++
        if (created % 25 === 0) {
          console.log(
            `  Created ${created} so far (existed ${existed}, failed ${failed})…`
          )
        }
      } catch (err: any) {
        failed++
        console.error(`  FAIL ${key}: ${err?.message?.slice(0, 200)}`)
        await qb
          .recordError(`Seed failed for ${key}: ${err?.message}`)
          .catch(() => {})
      }
    }
  }

  console.log("")
  console.log("Seed complete:")
  console.log(`  Created in QBO:   ${created}`)
  console.log(`  Already existed:  ${existed}`)
  console.log(`  Skipped (no key): ${skipped}`)
  console.log(`  Failed:           ${failed}`)
}
