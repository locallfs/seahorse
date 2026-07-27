// Pure planning core for the admin Size Variants editor. Given the product's
// current variants and the staff's requested sizes, it decides — with no I/O —
// exactly which variants to convert, create, or update, which SKUs to mint,
// and what the final Size option values and supply ordering are. The API
// route executes the plan; this module is what the tests exercise.

import { buildVariantSku } from "./sku"
import {
  SizeSystem,
  canonicalFixedSize,
  isValidSizeForSystem,
  normalizeSizeValue,
  orderSizeValues,
} from "./sizes"

export type ExistingVariantState = {
  id: string
  title: string | null
  sku: string | null
  /** The variant's current "Size" option value, if the option exists. */
  size_value: string | null
}

export type RequestedSize = {
  value: string
  price: number
  sale_price?: number | null
  sku?: string | null
  /** One field for UPC/barcode — written to both variant columns. */
  upc_barcode?: string | null
  quantity?: number | null
  disabled?: boolean
}

type PlannedVariant = {
  value: string
  title: string
  sku: string
  barcode: string | null
  price: number
  sale_price: number | null
  quantity: number | null
  disabled: boolean
}

export type SizePlan =
  | {
      ok: true
      /** Every Size option value the product needs, in display order. */
      option_values: string[]
      /** Placeholder variant converted in place to the first new size. */
      convert: (PlannedVariant & { variant_id: string }) | null
      create: PlannedVariant[]
      update: Array<PlannedVariant & { variant_id: string }>
      /** Supply staff ordering to store in metadata (null for fish/coral). */
      size_order: string[] | null
    }
  | { ok: false; errors: string[] }

export type PlanArgs = {
  size_system: SizeSystem
  sizes: RequestedSize[]
  existing: ExistingVariantState[]
  product_title: string
  product_handle: string | null
  /** Every SKU in the catalog (for minting + conflict checks). */
  taken_skus: Set<string>
  /** SKU/UPC/barcode owned by OTHER products' variants → visible rejection. */
  foreign_codes: Set<string>
}

// Placeholder titles a single unsized variant may carry — safe to convert in
// place so its inventory and QuickBooks mapping survive.
const PLACEHOLDER_TITLES = ["default variant", "default", "one size"]

const norm = (s: string | null | undefined) =>
  normalizeSizeValue(s ?? "").toLowerCase()

function displayLabel(system: SizeSystem, value: string): string {
  return canonicalFixedSize(system, value) ?? normalizeSizeValue(value)
}

export function planSizeVariants(args: PlanArgs): SizePlan {
  const errors: string[] = []
  const {
    size_system,
    sizes,
    existing,
    product_title,
    product_handle,
    taken_skus,
    foreign_codes,
  } = args

  if (sizes.length === 0) {
    return { ok: false, errors: ["Enable at least one size before saving."] }
  }

  // 1. Validate values + reject duplicates (case/whitespace-insensitive).
  const seen = new Set<string>()
  for (const s of sizes) {
    const key = norm(s.value)
    if (!isValidSizeForSystem(size_system, s.value)) {
      errors.push(
        size_system === "supply"
          ? `Size "${s.value}" is empty — enter a size label.`
          : `"${s.value}" is not a valid ${size_system} size.`
      )
      continue
    }
    if (seen.has(key)) {
      errors.push(`Duplicate size "${displayLabel(size_system, s.value)}" — each size may appear once.`)
    }
    seen.add(key)
    if (!(Number.isFinite(s.price) && s.price >= 0)) {
      errors.push(`Size "${displayLabel(size_system, s.value)}" needs a valid price.`)
    }
    if (
      s.sale_price != null &&
      (!Number.isFinite(s.sale_price) || s.sale_price < 0 || s.sale_price >= s.price)
    ) {
      errors.push(
        `Sale price for "${displayLabel(size_system, s.value)}" must be below the regular price.`
      )
    }
  }
  if (errors.length) return { ok: false, errors }

  // 2. Match requested sizes to existing variants by Size option value first,
  //    then by variant title (covers pre-option products).
  const byId = new Map(existing.map((v) => [v.id, v]))
  const matchFor = (value: string): ExistingVariantState | null => {
    const key = norm(value)
    return (
      existing.find((v) => norm(v.size_value) === key) ??
      existing.find((v) => v.size_value == null && norm(v.title) === key) ??
      null
    )
  }

  const matchedIds = new Set<string>()
  const updates: Array<PlannedVariant & { variant_id: string }> = []
  const pendingCreates: RequestedSize[] = []
  for (const s of sizes) {
    const match = matchFor(s.value)
    if (match && !matchedIds.has(match.id)) {
      matchedIds.add(match.id)
      updates.push({
        variant_id: match.id,
        value: displayLabel(size_system, s.value),
        title: displayLabel(size_system, s.value),
        sku: normalizeSizeValue(s.sku ?? "") || match.sku || "",
        barcode: normalizeSizeValue(s.upc_barcode ?? "") || null,
        price: s.price,
        sale_price: s.sale_price ?? null,
        quantity: s.quantity ?? null,
        disabled: !!s.disabled,
      })
    } else {
      pendingCreates.push(s)
    }
  }

  // 3. A lone placeholder variant converts in place to the first unmatched
  //    size — its SKU, inventory, and QuickBooks mapping survive untouched.
  let convert: (PlannedVariant & { variant_id: string }) | null = null
  const unmatchedExisting = existing.filter((v) => !matchedIds.has(v.id))
  if (
    pendingCreates.length > 0 &&
    existing.length === 1 &&
    unmatchedExisting.length === 1 &&
    unmatchedExisting[0].size_value == null &&
    (PLACEHOLDER_TITLES.includes(norm(unmatchedExisting[0].title)) ||
      norm(unmatchedExisting[0].title) === norm(product_title))
  ) {
    const target = pendingCreates.shift()!
    const placeholder = unmatchedExisting[0]
    convert = {
      variant_id: placeholder.id,
      value: displayLabel(size_system, target.value),
      title: displayLabel(size_system, target.value),
      sku: normalizeSizeValue(target.sku ?? "") || placeholder.sku || "",
      barcode: normalizeSizeValue(target.upc_barcode ?? "") || null,
      price: target.price,
      sale_price: target.sale_price ?? null,
      quantity: target.quantity ?? null,
      disabled: !!target.disabled,
    }
  }

  // 4. Mint SKUs for new sizes that don't bring one, collision-safe against
  //    the whole catalog (same generator the rest of the backend uses).
  const taken = new Set(taken_skus)
  for (const u of updates) if (u.sku) taken.add(u.sku)
  if (convert?.sku) taken.add(convert.sku)
  const totalCount = existing.length + pendingCreates.length
  const creates: PlannedVariant[] = pendingCreates.map((s, i) => {
    const provided = normalizeSizeValue(s.sku ?? "")
    const sku =
      provided ||
      buildVariantSku(
        product_title,
        product_handle,
        existing.length + i,
        Math.max(totalCount, 2),
        taken
      )
    if (provided) taken.add(provided)
    return {
      value: displayLabel(size_system, s.value),
      title: displayLabel(size_system, s.value),
      sku,
      barcode: normalizeSizeValue(s.upc_barcode ?? "") || null,
      price: s.price,
      sale_price: s.sale_price ?? null,
      quantity: s.quantity ?? null,
      disabled: !!s.disabled,
    }
  })

  // 5. SKU/UPC conflicts with OTHER products go to visible review — never
  //    silently adopted.
  const allPlanned = [...updates, ...(convert ? [convert] : []), ...creates]
  for (const p of allPlanned) {
    const ownSku = "variant_id" in p ? byId.get((p as { variant_id: string }).variant_id)?.sku : null
    if (p.sku && foreign_codes.has(p.sku) && p.sku !== ownSku) {
      errors.push(
        `SKU "${p.sku}" already belongs to another product — resolve the conflict before saving.`
      )
    }
    if (p.barcode && foreign_codes.has(p.barcode)) {
      errors.push(
        `UPC/barcode "${p.barcode}" already belongs to another product — resolve the conflict before saving.`
      )
    }
  }
  if (errors.length) return { ok: false, errors }

  // 6. Final option values in display order; supply keeps staff order.
  const requestedValues = sizes.map((s) => displayLabel(size_system, s.value))
  const keptExisting = existing
    .filter((v) => !matchedIds.has(v.id) && v.id !== convert?.variant_id)
    .map((v) => normalizeSizeValue(v.size_value ?? v.title ?? ""))
    .filter(Boolean)
  const optionValues = orderSizeValues(size_system, [
    ...new Set([...requestedValues, ...keptExisting]),
  ])

  return {
    ok: true,
    option_values: optionValues,
    convert,
    create: creates,
    update: updates,
    size_order: size_system === "supply" ? requestedValues : null,
  }
}
