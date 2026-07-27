/* eslint-disable @typescript-eslint/no-explicit-any */
// READ-ONLY migration report for the size-variants rollout. Writes nothing.
// Run with:  npx medusa exec ./src/scripts/size-variant-report.ts
// It lists: products that already have multiple variants, products that look
// like duplicate size-specific listings, single-variant products that can stay
// as they are, and SKU/UPC/inventory/QuickBooks-mapping conflicts — the
// approval checklist before any manual consolidation.

import { ExecArgs } from "@medusajs/types"
import { ContainerRegistrationKeys } from "@medusajs/utils"

// Size words that suggest a title encodes a size-specific duplicate listing.
const SIZE_TOKEN_RE =
  /\b(tiny|small|medium|large|show|colony|x{0,2}s|x{0,2}l|sm|md|lg|\d+(\.\d+)?\s*(in(ch(es)?)?|"|ml|l|oz|lb|lbs|g|kg|gal|count|ct|pack|pk))\b\.?/gi

function stripSizeTokens(title: string): string {
  return title
    .toLowerCase()
    .replace(SIZE_TOKEN_RE, " ")
    .replace(/[-–—()\[\],\/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export default async function sizeVariantReport({ container }: ExecArgs) {
  const pg: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const rows = (
    await pg.raw(
      `select p.id as product_id, p.title, p.handle, p.status,
              p.metadata->>'size_system' as size_system,
              pv.id as variant_id, pv.title as variant_title,
              nullif(trim(coalesce(pv.sku,'')),'') as sku,
              nullif(trim(coalesce(pv.upc,'')),'') as upc,
              nullif(trim(coalesce(pv.barcode,'')),'') as barcode,
              m.qbo_item_id
         from product p
         join product_variant pv on pv.product_id = p.id and pv.deleted_at is null
         left join quickbooks_item_map m on m.variant_id = pv.id and m.deleted_at is null
        where p.deleted_at is null
        order by p.title, pv.title`
    )
  ).rows as any[]

  const byProduct = new Map<string, any[]>()
  for (const r of rows) {
    const list = byProduct.get(r.product_id) ?? []
    list.push(r)
    byProduct.set(r.product_id, list)
  }

  const multiVariant: string[] = []
  const singleVariant: string[] = []
  for (const [, variants] of byProduct) {
    const p = variants[0]
    const label = `${p.title} (${variants.length} variants${p.size_system ? `, size_system=${p.size_system}` : ""})`
    if (variants.length > 1) multiVariant.push(label)
    else singleVariant.push(p.title)
  }

  // Probable duplicate size-specific listings: distinct products whose titles
  // collapse to the same base once size words are stripped. Title heuristics
  // are fine HERE because this is a read-only report — never sync logic.
  const byBase = new Map<string, string[]>()
  for (const [, variants] of byProduct) {
    const p = variants[0]
    const base = stripSizeTokens(p.title ?? "")
    if (!base) continue
    const list = byBase.get(base) ?? []
    list.push(p.title)
    byBase.set(base, list)
  }
  const likelyDuplicates = [...byBase.values()].filter((v) => v.length > 1)

  // Identifier conflicts across the catalog.
  const codeOwners = new Map<string, Set<string>>()
  for (const r of rows) {
    for (const code of [r.sku, r.upc, r.barcode]) {
      if (!code) continue
      const owners = codeOwners.get(code) ?? new Set<string>()
      owners.add(`${r.title} / ${r.variant_title ?? "—"}`)
      codeOwners.set(code, owners)
    }
  }
  const codeConflicts = [...codeOwners.entries()].filter(
    ([, owners]) => owners.size > 1
  )

  const missingIdentifiers = rows.filter((r) => !r.sku && !r.upc && !r.barcode)
  const unmappedVariants = rows.filter((r) => !r.qbo_item_id)

  // A QBO item mapped to more than one variant would be a broken ledger.
  const qboOwners = new Map<string, number>()
  for (const r of rows) {
    if (r.qbo_item_id) {
      qboOwners.set(r.qbo_item_id, (qboOwners.get(r.qbo_item_id) ?? 0) + 1)
    }
  }
  const doubleMapped = [...qboOwners.entries()].filter(([, n]) => n > 1)

  // Duplicate inventory links (the "Repair" case in the variant widget).
  const dupInv = (
    await pg.raw(
      `select l.variant_id, count(*) as links
         from product_variant_inventory_item l
        where l.deleted_at is null
        group by l.variant_id
       having count(*) > 1`
    )
  ).rows as any[]

  const line = (s = "") => console.log(s)
  line("=".repeat(72))
  line("SIZE-VARIANT MIGRATION REPORT (read-only — nothing was changed)")
  line("=".repeat(72))
  line()
  line(`Products: ${byProduct.size}   Variants: ${rows.length}`)
  line()
  line(`— Products that ALREADY have multiple variants (${multiVariant.length}):`)
  for (const t of multiVariant) line(`    • ${t}`)
  line()
  line(
    `— Titles that look like duplicate size-specific listings (${likelyDuplicates.length} groups — review before consolidating):`
  )
  for (const group of likelyDuplicates) line(`    • ${group.join("  |  ")}`)
  line()
  line(
    `— Single-variant products that can safely stay as they are: ${singleVariant.length}`
  )
  line()
  line(`— SKU/UPC/barcode used by more than one variant (${codeConflicts.length}):`)
  for (const [code, owners] of codeConflicts)
    line(`    • ${code}: ${[...owners].join("  |  ")}`)
  line()
  line(`— Variants with NO identifier at all (${missingIdentifiers.length}):`)
  for (const r of missingIdentifiers.slice(0, 25))
    line(`    • ${r.title} / ${r.variant_title ?? "—"}`)
  if (missingIdentifiers.length > 25)
    line(`    … and ${missingIdentifiers.length - 25} more`)
  line()
  line(`— Variants not mapped to a QuickBooks item (${unmappedVariants.length}):`)
  for (const r of unmappedVariants.slice(0, 25))
    line(`    • ${r.title} / ${r.variant_title ?? "—"}`)
  if (unmappedVariants.length > 25)
    line(`    … and ${unmappedVariants.length - 25} more`)
  line()
  line(`— QuickBooks items mapped to MORE than one variant (${doubleMapped.length}):`)
  for (const [id, n] of doubleMapped) line(`    • QBO item ${id}: ${n} variants`)
  line()
  line(`— Variants with duplicate inventory links (${dupInv.length}):`)
  for (const r of dupInv) line(`    • variant ${r.variant_id}: ${r.links} links`)
  line()
  line("Done. No data was modified.")
}
