/* eslint-disable @typescript-eslint/no-explicit-any */
// PURE catalog↔QuickBooks reconciliation. No I/O, no writes — fully unit-
// testable, and shared by the manual ledger stamp and dry runs so what gets
// tested is exactly what runs.
//
// MATCHING PRECEDENCE (per variant): UPC → barcode → SKU. The first code (in
// that order) that resolves to exactly one QuickBooks item wins.
//
// NORMALIZATION RULES (both sides, applied identically):
//   - trim leading/trailing whitespace
//   - case-insensitive comparison (both sides lowercased)
//   - punctuation and inner characters preserved verbatim (no stripping)
//   - LEADING ZEROS PRESERVED — codes are compared as strings, never numbers
//
// ABORT GUARDS (any one aborts; callers must write NOTHING on abort):
//   G-BLANK     variants exist but every identifier is blank (read regression)
//   G-EMPTYQBO  QuickBooks item list came back empty
//   G-DUPQBO    the same code appears on 2+ QuickBooks items (ambiguous)
//   G-DUPVAR    the same code appears on 2+ store variants (ambiguous)
//   G-CONFLICT  a variant's SKU and UPC resolve to DIFFERENT QuickBooks items
//   G-RATE      pairs < 85% of code-bearing variants
//   G-BASELINE  pairs more than 5% below the last successful reconciliation

export type ReconVariant = {
  variant_id: string
  title?: string | null
  sku: string | null
  upc: string | null
  barcode: string | null
}

export type ReconQboItem = { id: string; sku: string | null; name?: string }

export type ReconcileResult = {
  stats: {
    variants: number
    qboItems: number
    codeBearing: number
    noCode: number
    matchedBySku: number
    matchedByUpc: number
    matchedByBarcode: number
    bothSkuAndUpcAgree: number
    identifierConflicts: number
    ambiguousCodes: number
    paired: number
    unmatchedCodeBearingVariants: number
    unmatchedQboItems: number
  }
  pairs: Array<{ variantId: string; qboItemId: string; via: "upc" | "barcode" | "sku" }>
  lists: {
    noCodeVariants: ReconVariant[]
    unmatchedVariants: ReconVariant[]
    unmatchedQboItems: ReconQboItem[]
    // Any two POPULATED identifiers (sku/upc/barcode) resolving to different
    // QuickBooks items — full hit map included for diagnosis.
    conflicts: Array<{
      variant: ReconVariant
      hits: { sku?: string; upc?: string; barcode?: string }
    }>
    ambiguousQboCodes: Array<{ code: string; qboItemIds: string[] }>
    duplicateVariantCodes: Array<{ code: string; variantIds: string[] }>
  }
  // Authoritative abort = FIRST tripped guard in fixed severity order:
  // G-BLANK → G-EMPTYQBO → G-DUPQBO → G-DUPVAR → G-CONFLICT → G-NOBASELINE
  // → G-RATE → G-BASELINE. All tripped guards are reported in failedGuards.
  abort: string | null
  failedGuards: string[]
}

const norm = (s: string | null | undefined): string | null => {
  const t = (s ?? "").trim()
  return t === "" ? null : t.toLowerCase()
}

export function reconcile(
  variants: ReconVariant[],
  qboItems: ReconQboItem[],
  opts?: {
    // null/undefined = no baseline available. When requireBaseline is true a
    // missing baseline ABORTS (G-NOBASELINE) — never a silent fallback.
    baselinePaired?: number | null
    requireBaseline?: boolean
  }
): ReconcileResult {
  // --- index QuickBooks items by normalized code, detecting duplicates ---
  const qboByCode = new Map<string, string[]>()
  for (const it of qboItems) {
    const c = norm(it.sku)
    if (!c) continue
    const arr = qboByCode.get(c) ?? []
    arr.push(String(it.id))
    qboByCode.set(c, arr)
  }
  const ambiguousQboCodes = [...qboByCode.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([code, qboItemIds]) => ({ code, qboItemIds }))

  // --- detect duplicate codes across store variants ---
  const varByCode = new Map<string, string[]>()
  for (const v of variants) {
    for (const c of [norm(v.upc), norm(v.barcode), norm(v.sku)]) {
      if (!c) continue
      const arr = varByCode.get(c) ?? []
      if (!arr.includes(v.variant_id)) arr.push(v.variant_id)
      varByCode.set(c, arr)
    }
  }
  const duplicateVariantCodes = [...varByCode.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([code, variantIds]) => ({ code, variantIds }))

  const uniqueHit = (code: string | null): string | null => {
    if (!code) return null
    const ids = qboByCode.get(code)
    return ids && ids.length === 1 ? ids[0] : null
  }

  // --- per-variant matching ---
  const pairs: ReconcileResult["pairs"] = []
  const noCodeVariants: ReconVariant[] = []
  const unmatchedVariants: ReconVariant[] = []
  const conflicts: ReconcileResult["lists"]["conflicts"] = []
  let matchedBySku = 0
  let matchedByUpc = 0
  let matchedByBarcode = 0
  let bothAgree = 0
  const pairedQboIds = new Set<string>()

  for (const v of variants) {
    const nUpc = norm(v.upc)
    const nBarcode = norm(v.barcode)
    const nSku = norm(v.sku)
    if (!nUpc && !nBarcode && !nSku) {
      noCodeVariants.push(v)
      continue
    }
    const skuHit = uniqueHit(nSku)
    const upcHit = uniqueHit(nUpc)
    const barcodeHit = uniqueHit(nBarcode)

    // Conflict = ANY two populated identifiers resolving to different items
    // (sku/upc, sku/barcode, upc/barcode — all pairs checked).
    const hitList = [upcHit, barcodeHit, skuHit].filter(
      (h): h is string => h != null
    )
    const distinct = new Set(hitList)
    if (distinct.size > 1) {
      const hits: { sku?: string; upc?: string; barcode?: string } = {}
      if (skuHit) hits.sku = skuHit
      if (upcHit) hits.upc = upcHit
      if (barcodeHit) hits.barcode = barcodeHit
      conflicts.push({ variant: v, hits })
      continue // conflicting variant is never paired
    }
    if (hitList.length >= 2) bothAgree++

    const winner = upcHit ?? barcodeHit ?? skuHit
    if (winner) {
      const via = upcHit ? "upc" : barcodeHit ? "barcode" : "sku"
      if (via === "upc") matchedByUpc++
      else if (via === "barcode") matchedByBarcode++
      else matchedBySku++
      pairs.push({ variantId: v.variant_id, qboItemId: winner, via })
      pairedQboIds.add(winner)
    } else {
      unmatchedVariants.push(v)
    }
  }

  const unmatchedQboItems = qboItems.filter(
    (it) => !pairedQboIds.has(String(it.id))
  )

  const codeBearing = variants.length - noCodeVariants.length
  const stats: ReconcileResult["stats"] = {
    variants: variants.length,
    qboItems: qboItems.length,
    codeBearing,
    noCode: noCodeVariants.length,
    matchedBySku,
    matchedByUpc,
    matchedByBarcode,
    bothSkuAndUpcAgree: bothAgree,
    identifierConflicts: conflicts.length,
    ambiguousCodes: ambiguousQboCodes.length + duplicateVariantCodes.length,
    paired: pairs.length,
    unmatchedCodeBearingVariants: unmatchedVariants.length,
    unmatchedQboItems: unmatchedQboItems.length,
  }

  // --- guards: ALL evaluated; authoritative = first in fixed severity order ---
  const failedGuards: string[] = []
  if (variants.length > 0 && codeBearing === 0) {
    failedGuards.push(
      `G-BLANK: ${variants.length} variants read, zero identifiers — read path regression`
    )
  }
  if (qboItems.length === 0) {
    failedGuards.push("G-EMPTYQBO: QuickBooks item list came back empty")
  }
  if (ambiguousQboCodes.length > 0) {
    failedGuards.push(
      `G-DUPQBO: ${ambiguousQboCodes.length} code(s) appear on multiple QuickBooks items`
    )
  }
  if (duplicateVariantCodes.length > 0) {
    failedGuards.push(
      `G-DUPVAR: ${duplicateVariantCodes.length} code(s) appear on multiple store variants`
    )
  }
  if (conflicts.length > 0) {
    failedGuards.push(
      `G-CONFLICT: ${conflicts.length} variant(s) with populated identifiers pointing at different QuickBooks items`
    )
  }
  if (opts?.requireBaseline && opts?.baselinePaired == null) {
    failedGuards.push(
      "G-NOBASELINE: no prior successful reconciliation baseline is stored — refusing to proceed without one (explicit initial-run override required)"
    )
  }
  if (codeBearing > 0 && pairs.length < codeBearing * 0.85) {
    failedGuards.push(
      `G-RATE: only ${pairs.length}/${codeBearing} code-bearing variants paired (<85%)`
    )
  }
  if (
    opts?.baselinePaired != null &&
    opts.baselinePaired > 0 &&
    pairs.length < opts.baselinePaired * 0.95
  ) {
    failedGuards.push(
      `G-BASELINE: paired ${pairs.length} vs last successful ${opts.baselinePaired} (>5% drop)`
    )
  }
  const abort = failedGuards.length > 0 ? failedGuards[0] : null

  return {
    stats,
    // Hard contract: an aborted reconciliation exposes ZERO writable pairs —
    // even a careless caller cannot produce writes from an aborted run.
    // (stats.paired still reports what WOULD have paired, for diagnostics.)
    pairs: abort ? [] : pairs,
    lists: {
      noCodeVariants,
      unmatchedVariants,
      unmatchedQboItems,
      conflicts,
      ambiguousQboCodes,
      duplicateVariantCodes,
    },
    abort,
    failedGuards,
  }
}
