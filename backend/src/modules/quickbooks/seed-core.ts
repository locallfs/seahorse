/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { QUICKBOOKS_MODULE } from "."
import type QuickbooksModuleService from "./service"
import {
  findInventoryAccounts,
  findItemBySku,
  createInventoryItem,
} from "./items"
import { resolveItemKey, variantOnHand } from "./mapping"

export type SeedResult = {
  created: number
  existed: number
  skipped: number
  failed: number
}

// Idempotently creates a QBO Inventory item (with current Medusa on-hand) for
// every variant that doesn't already have one, keyed by UPC → barcode → SKU.
// Shared by the seed script and the admin "Resync all" button.
export async function seedInventoryItems(container: {
  resolve: (k: string) => any
}): Promise<SeedResult> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const qb = container.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService

  const accounts = await findInventoryAccounts(qb)
  const invStartDate = new Date().toISOString().slice(0, 10)

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
      } catch (err: any) {
        failed++
        await qb
          .recordError(`Seed failed for ${key}: ${err?.message}`)
          .catch(() => {})
      }
    }
  }

  return { created, existed, skipped, failed }
}
