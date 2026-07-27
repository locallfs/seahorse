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

  // Categories, tags, and options per product — for the classification and
  // representability sections below.
  const catRows = (
    await pg.raw(
      `select pcp.product_id, lower(pc.handle) as handle
         from product_category_product pcp
         join product_category pc on pc.id = pcp.product_category_id
          and pc.deleted_at is null`
    )
  ).rows as any[]
  const tagRows = (
    await pg.raw(
      `select ptj.product_id, lower(trim(pt.value)) as value
         from product_tags ptj
         join product_tag pt on pt.id = ptj.product_tag_id
          and pt.deleted_at is null`
    )
  ).rows as any[]
  const optRows = (
    await pg.raw(
      `select po.product_id, po.title
         from product_option po
        where po.deleted_at is null`
    )
  ).rows as any[]
  const catsByProduct = new Map<string, Set<string>>()
  for (const r of catRows) {
    const s = catsByProduct.get(r.product_id) ?? new Set()
    s.add(r.handle)
    catsByProduct.set(r.product_id, s)
  }
  const tagsByProduct = new Map<string, Set<string>>()
  for (const r of tagRows) {
    const s = tagsByProduct.get(r.product_id) ?? new Set()
    s.add(r.value)
    tagsByProduct.set(r.product_id, s)
  }
  const optsByProduct = new Map<string, string[]>()
  for (const r of optRows) {
    const l = optsByProduct.get(r.product_id) ?? []
    l.push(String(r.title ?? ""))
    optsByProduct.set(r.product_id, l)
  }

  // Proposed classification (same stable data the size/shipping rules use).
  const FISH_HANDLES = ["fish", "saltwater-fish", "seahorses"]
  const CORAL_HANDLES = ["corals", "coral"]
  const SUPPLY_HANDLES = ["supplies"]
  const LIVE_OTHER_HANDLES = ["inverts", "invertebrates"]
  const FISH_TAGS = ["fish", "wysiwyg fish"]
  const CORAL_TAGS = ["coral", "corals", "wysiwyg coral", "wysiwyg corals"]
  const SUPPLY_TAGS = ["supplies", "supply"]
  const LIVE_OTHER_TAGS = ["invert", "inverts", "macro", "macroalgae"]
  const classify = (productId: string): string => {
    const cats = catsByProduct.get(productId) ?? new Set()
    const tags = tagsByProduct.get(productId) ?? new Set()
    const hasAny = (set: Set<string>, wanted: string[]) =>
      wanted.some((w) => set.has(w))
    if (hasAny(cats, FISH_HANDLES) || hasAny(tags, FISH_TAGS)) return "fish"
    if (hasAny(cats, CORAL_HANDLES) || hasAny(tags, CORAL_TAGS)) return "coral"
    if (hasAny(cats, SUPPLY_HANDLES) || hasAny(tags, SUPPLY_TAGS)) return "supply"
    if (hasAny(cats, LIVE_OTHER_HANDLES) || hasAny(tags, LIVE_OTHER_TAGS))
      return "other-live"
    return "unclassified"
  }

  const FISH_SIZE_SET = new Set(
    ["tiny", "small", "small–medium", "medium", "medium–large", "large", "show"]
  )
  const CORAL_SIZE_SET = new Set([
    "½\"", "1\"", "1½\"", "2\"", "2½\"", "3\"", "3½\"", "4\"", "4½\"", "5\"",
    "5½\"", "6\"", "colony",
  ])
  const PLACEHOLDER_TITLES = ["default variant", "default", "one size"]
  const normTitle = (s: string | null) =>
    String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim()

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

  // Inventory items whose stock is split across multiple locations.
  const multiLoc = (
    await pg.raw(
      `select l.variant_id, il.inventory_item_id,
              count(distinct il.location_id) as locations
         from inventory_level il
         join product_variant_inventory_item l
           on l.inventory_item_id = il.inventory_item_id
          and l.deleted_at is null
        where il.deleted_at is null
        group by l.variant_id, il.inventory_item_id
       having count(distinct il.location_id) > 1`
    )
  ).rows as any[]

  // Products whose lone placeholder variant would be CONVERTED in place the
  // first time staff enables sizes (SKU/inventory/QBO mapping preserved).
  const convertCandidates: string[] = []
  for (const [, variants] of byProduct) {
    if (variants.length !== 1) continue
    const p = variants[0]
    const vt = normTitle(p.variant_title)
    if (PLACEHOLDER_TITLES.includes(vt) || vt === normTitle(p.title)) {
      convertCandidates.push(
        `${p.title} (variant "${p.variant_title ?? "—"}", sku=${p.sku ?? "—"})`
      )
    }
  }

  // Classification counts under the proposed rules.
  const classCounts: Record<string, number> = {}
  const unclassifiedTitles: string[] = []
  for (const [productId, variants] of byProduct) {
    const bucket = classify(productId)
    classCounts[bucket] = (classCounts[bucket] ?? 0) + 1
    if (bucket === "unclassified") unclassifiedTitles.push(variants[0].title)
  }

  // Products whose CURRENT variants can't be represented by their proposed
  // size system without manual review.
  const unrepresentable: string[] = []
  for (const [productId, variants] of byProduct) {
    const p = variants[0]
    const bucket = classify(productId)
    const reasons: string[] = []
    const titles = variants.map((v: any) => normTitle(v.variant_title))
    const dupTitles = titles.filter((t, i) => titles.indexOf(t) !== i)
    if (dupTitles.length > 0) {
      reasons.push(`duplicate variant titles (${[...new Set(dupTitles)].join(", ")})`)
    }
    const realOptions = (optsByProduct.get(productId) ?? []).filter(
      (t) => !["size", "default", "default option", "title"].includes(normTitle(t))
    )
    if (realOptions.length > 0) {
      reasons.push(`non-Size option(s): ${realOptions.join(", ")}`)
    }
    if (variants.length > 1 && (bucket === "fish" || bucket === "coral")) {
      const set = bucket === "fish" ? FISH_SIZE_SET : CORAL_SIZE_SET
      const bad = titles.filter((t) => !set.has(t))
      if (bad.length > 0) {
        reasons.push(
          `variant titles outside the fixed ${bucket} sizes: ${bad.join(", ")}`
        )
      }
    }
    if (reasons.length > 0) {
      unrepresentable.push(`${p.title} — ${reasons.join("; ")}`)
    }
  }

  // Products with several variants mapped to several QBO items — EXPECTED
  // under sizes (informational only; conflicts are the double-mapped list).
  const multiMappedProducts = [...byProduct.values()].filter(
    (variants) => variants.filter((v: any) => v.qbo_item_id).length > 1
  ).length

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
  line(
    `— Inventory items split across multiple stock locations (${multiLoc.length}):`
  )
  for (const r of multiLoc)
    line(
      `    • variant ${r.variant_id}: item ${r.inventory_item_id} in ${r.locations} locations`
    )
  line()
  line(
    `— Products whose lone Default variant WOULD be converted in place when sizes are enabled (${convertCandidates.length}):`
  )
  for (const t of convertCandidates) line(`    • ${t}`)
  line()
  line("— Classification under the proposed size/shipping rules:")
  for (const bucket of ["fish", "coral", "supply", "other-live", "unclassified"])
    line(`    • ${bucket}: ${classCounts[bucket] ?? 0}`)
  if (unclassifiedTitles.length > 0) {
    line(`    unclassified titles:`)
    for (const t of unclassifiedTitles.slice(0, 40)) line(`      - ${t}`)
    if (unclassifiedTitles.length > 40)
      line(`      … and ${unclassifiedTitles.length - 40} more`)
  }
  line()
  line(
    `— Products needing MANUAL review before a size system can represent them (${unrepresentable.length}):`
  )
  for (const t of unrepresentable) line(`    • ${t}`)
  line()
  line(
    `— Products with several variants mapped to several QuickBooks items (expected under sizes): ${multiMappedProducts}`
  )
  line()
  line("Done. No data was modified.")
}
