/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContainerRegistrationKeys } from "@medusajs/utils"
import type QuickbooksModuleService from "./service"
import { listAllActiveItems } from "./items"

const norm = (s: string) => s.trim().toLowerCase()

// One-shot, READ-ONLY (towards QuickBooks) ledger stamping: pairs every store
// variant with its QBO item by identifier trail (UPC → barcode → SKU) and
// records the pairing in quickbooks_item_map. Writes nothing to QuickBooks.
// Runs automatically from the sweeper when the ledger is empty, so no human
// has to time anything around the store's ongoing SKU→UPC replacement.
export async function stampLedger(
  container: { resolve: (k: string) => any },
  qb: QuickbooksModuleService
): Promise<{ paired: number; unmatched: number }> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "variants.id",
      "variants.sku",
      "variants.upc",
      "variants.barcode",
    ],
  })

  const all = await listAllActiveItems(qb)
  const bySku = new Map<string, string>()
  for (const it of all) {
    if (it.Sku && String(it.Sku).trim()) {
      bySku.set(norm(String(it.Sku)), String(it.Id))
    }
  }

  let paired = 0
  let unmatched = 0
  for (const product of products as any[]) {
    for (const variant of product.variants || []) {
      const trail = [variant.upc, variant.barcode, variant.sku]
        .map((k: any) => String(k || "").trim())
        .filter(Boolean)
      let qboId: string | undefined
      for (const t of trail) {
        qboId = bySku.get(norm(t))
        if (qboId) break
      }
      if (qboId) {
        await qb.mapVariantToQboItem(variant.id, qboId).catch(() => {})
        paired++
      } else {
        unmatched++
      }
    }
  }
  return { paired, unmatched }
}
