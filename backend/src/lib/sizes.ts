// Canonical size systems — the backend copy of the storefront's lib/sizes.ts.
// The fixed lists and their order are a cross-package contract: tests on both
// sides pin the exact same values. A product opts in via
// product.metadata.size_system; each size is a variant on the "Size" option
// whose variant title IS the customer-facing label.

export type SizeSystem = "fish" | "coral" | "supply"

export const SIZE_OPTION_TITLE = "Size"

// Fixed, ordered — never alphabetize. En dash (U+2013) in the combo sizes.
export const FISH_SIZES = [
  "Tiny",
  "Small",
  "Small–Medium",
  "Medium",
  "Medium–Large",
  "Large",
  "Show",
] as const

// Fixed, ordered numerically with Colony always last (vulgar ½, straight ").
export const CORAL_SIZES = [
  "½\"",
  "1\"",
  "1½\"",
  "2\"",
  "2½\"",
  "3\"",
  "3½\"",
  "4\"",
  "4½\"",
  "5\"",
  "5½\"",
  "6\"",
  "Colony",
] as const

export const SUPPLY_STANDARD_SIZES = ["Small", "Medium", "Large"] as const

export function normalizeSizeValue(value: string): string {
  return (value ?? "").replace(/\s+/g, " ").trim()
}

export function isSizeSystem(value: unknown): value is SizeSystem {
  return value === "fish" || value === "coral" || value === "supply"
}

/** Canonical label for a fixed-list size, matched case-insensitively. */
export function canonicalFixedSize(
  system: SizeSystem,
  value: string
): string | null {
  if (system === "supply") return null
  const list = system === "fish" ? FISH_SIZES : CORAL_SIZES
  const norm = normalizeSizeValue(value).toLowerCase()
  return list.find((s) => s.toLowerCase() === norm) ?? null
}

/** Fish/coral values must come from the fixed list; supply needs any text. */
export function isValidSizeForSystem(
  system: SizeSystem,
  value: string
): boolean {
  const norm = normalizeSizeValue(value)
  if (!norm) return false
  if (system === "supply") return true
  return canonicalFixedSize(system, norm) !== null
}

/**
 * Order size values for a system. Fish/coral: canonical list order. Supply:
 * the given order is authoritative (the admin editor controls it) — never
 * alphabetized here.
 */
export function orderSizeValues(
  system: SizeSystem,
  values: string[]
): string[] {
  if (system === "supply") return [...values]
  const list: readonly string[] = system === "fish" ? FISH_SIZES : CORAL_SIZES
  const rank = (v: string) => {
    const canonical = canonicalFixedSize(system, v)
    return canonical ? list.indexOf(canonical) : list.length
  }
  return [...values].sort((a, b) => rank(a) - rank(b))
}
