/* eslint-disable @typescript-eslint/no-explicit-any */
// ALL store-side reads for the QuickBooks sync go through direct SQL against
// verified tables/columns. query.graph is BANNED in this module: it silently
// returns blank fields depending on caller context (proven in production
// 2026-07-21 and again 2026-07-23), which is how a stamping pass once read an
// entire catalog as identifier-less. Every query below was validated against
// the production schema before shipping.

export type CatalogVariantRow = {
  product_id: string
  product_title: string
  // The separate QuickBooks Description (product.metadata.quickbooks_description).
  // The WEBSITE description (product.description) is deliberately NOT read
  // here — it must never reach a QuickBooks payload.
  qb_description: string | null
  variant_id: string
  variant_title: string | null
  sku: string | null
  upc: string | null
  barcode: string | null
  usd_amount: number | null
  on_hand: number
}

export async function readCatalogVariants(pg: any): Promise<CatalogVariantRow[]> {
  const res = await pg.raw(
    `select
       p.id as product_id,
       p.title as product_title,
       p.metadata->>'quickbooks_description' as qb_description,
       pv.id as variant_id,
       pv.title as variant_title,
       nullif(trim(coalesce(pv.sku,'')),'') as sku,
       nullif(trim(coalesce(pv.upc,'')),'') as upc,
       nullif(trim(coalesce(pv.barcode,'')),'') as barcode,
       (select pr.amount
          from product_variant_price_set pvps
          join price pr on pr.price_set_id = pvps.price_set_id
           and pr.deleted_at is null
           and pr.currency_code = 'usd'
           and pr.price_list_id is null
         where pvps.variant_id = pv.id and pvps.deleted_at is null
         limit 1) as usd_amount,
       coalesce((select sum(il.stocked_quantity)
          from product_variant_inventory_item l
          join inventory_level il on il.inventory_item_id = l.inventory_item_id
           and il.deleted_at is null
         where l.variant_id = pv.id and l.deleted_at is null), 0) as on_hand
     from product p
     join product_variant pv on pv.product_id = p.id
     where p.deleted_at is null and pv.deleted_at is null`
  )
  return (res?.rows || []).map((r: any) => ({
    ...r,
    usd_amount: r.usd_amount == null ? null : Number(r.usd_amount),
    on_hand: Number(r.on_hand ?? 0),
  }))
}

export type VariantIdentRow = {
  variant_id: string
  sku: string | null
  upc: string | null
  barcode: string | null
}

export async function readVariantById(
  pg: any,
  variantId: string
): Promise<VariantIdentRow | null> {
  const res = await pg.raw(
    `select pv.id as variant_id,
            nullif(trim(coalesce(pv.sku,'')),'') as sku,
            nullif(trim(coalesce(pv.upc,'')),'') as upc,
            nullif(trim(coalesce(pv.barcode,'')),'') as barcode
       from product_variant pv
       join product p on p.id = pv.product_id
      where pv.id = ? and pv.deleted_at is null and p.deleted_at is null`,
    [variantId]
  )
  return res?.rows?.[0] ?? null
}

export async function readVariantByIdentifier(
  pg: any,
  key: string
): Promise<VariantIdentRow | null> {
  const res = await pg.raw(
    `select pv.id as variant_id,
            nullif(trim(coalesce(pv.sku,'')),'') as sku,
            nullif(trim(coalesce(pv.upc,'')),'') as upc,
            nullif(trim(coalesce(pv.barcode,'')),'') as barcode
       from product_variant pv
       join product p on p.id = pv.product_id
      where pv.deleted_at is null and p.deleted_at is null
        and (pv.upc = ? or pv.barcode = ? or pv.sku = ?)
      order by (pv.upc = ?) desc, (pv.barcode = ?) desc
      limit 1`,
    [key, key, key, key, key]
  )
  return res?.rows?.[0] ?? null
}

// PERMANENT REGRESSION GUARD: a non-empty catalog in which EVERY identifier
// is blank means the read path is lying again (the 2026-07-23 failure mode).
// Throw so callers abort before pairing or writing anything.
export function assertCatalogIdentifiersPresent(rows: CatalogVariantRow[]): void {
  if (rows.length === 0) return
  const withAny = rows.filter((r) => r.sku || r.upc || r.barcode).length
  if (withAny === 0) {
    throw new Error(
      `REGRESSION GUARD: catalog read returned ${rows.length} variants with ZERO identifiers — read path is returning blanks; aborting before any writes`
    )
  }
}
