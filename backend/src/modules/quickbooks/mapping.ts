/* eslint-disable @typescript-eslint/no-explicit-any */
// Shared mapping between Medusa variants and QuickBooks items.

// The join key: real registered UPC first (dry goods/supplies), then barcode,
// then the generated SKU (livestock have no UPC). This value goes in the QBO
// item's Sku field and is what both sync directions match on.
export function resolveItemKey(variant: {
  upc?: string | null
  barcode?: string | null
  sku?: string | null
}): string {
  return (variant?.upc || variant?.barcode || variant?.sku || "").trim()
}

// Sums a variant's on-hand quantity across its inventory items and stock
// locations, from a query.graph result that included
// variants.inventory_items.inventory.location_levels.stocked_quantity.
export function variantOnHand(variant: any): number {
  let total = 0
  for (const item of variant?.inventory_items || []) {
    for (const lvl of item?.inventory?.location_levels || []) {
      total += Number(lvl?.stocked_quantity ?? 0)
    }
  }
  return total
}
