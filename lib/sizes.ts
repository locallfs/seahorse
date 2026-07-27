// The ONE size model for the storefront. A product opts into a size system via
// product.metadata.size_system ("fish" | "coral" | "supply"); its sizes are
// Medusa variants on a single "Size" option whose variant title IS the
// customer-facing label. Fixed lists and their order are the contract shared
// with the backend copy (backend/src/lib/sizes.ts) — keep both identical.

export type SizeSystem = "fish" | "coral" | "supply";

// Fixed, ordered — never alphabetize. "Small–Medium" / "Medium–Large" use an
// en dash (U+2013), matching the variant titles the admin editor creates.
export const FISH_SIZES = [
  "Tiny",
  "Small",
  "Small–Medium",
  "Medium",
  "Medium–Large",
  "Large",
  "Show",
] as const;

// Fixed, ordered numerically with Colony always last. Labels use the vulgar
// half fraction (U+00BD) and a straight-quote inch mark.
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
] as const;

// Standard supply sizes rank ahead of custom ones (100 ml, 25 count, 36", …).
export const SUPPLY_STANDARD_SIZES = ["Small", "Medium", "Large"] as const;

export function normalizeSizeValue(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function getSizeSystem(
  metadata: Record<string, unknown> | null | undefined,
): SizeSystem | null {
  const raw = metadata?.size_system;
  return raw === "fish" || raw === "coral" || raw === "supply" ? raw : null;
}

// Natural compare for custom supply sizes so "2 oz" sorts before "10 oz".
const naturalCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function fixedRank(list: readonly string[], value: string): number {
  const idx = list.findIndex(
    (s) => normalizeSizeValue(s).toLowerCase() === normalizeSizeValue(value).toLowerCase(),
  );
  return idx === -1 ? list.length : idx;
}

/**
 * Compare two size labels within a size system.
 * - fish/coral: canonical list order; unknown labels sink below known ones.
 * - supply: staff order (metadata.size_order) wins, then standard S/M/L,
 *   then natural numeric compare — never plain alphabetical.
 */
export function compareSizes(
  system: SizeSystem,
  a: string,
  b: string,
  sizeOrder?: string[] | null,
): number {
  if (system === "fish" || system === "coral") {
    const list = system === "fish" ? FISH_SIZES : CORAL_SIZES;
    const ra = fixedRank(list, a);
    const rb = fixedRank(list, b);
    if (ra !== rb) return ra - rb;
    return naturalCollator.compare(a, b);
  }
  const order = (sizeOrder ?? []).map((s) => normalizeSizeValue(s).toLowerCase());
  const oa = order.indexOf(normalizeSizeValue(a).toLowerCase());
  const ob = order.indexOf(normalizeSizeValue(b).toLowerCase());
  if (oa !== -1 || ob !== -1) {
    if (oa === -1) return 1;
    if (ob === -1) return -1;
    return oa - ob;
  }
  const sa = fixedRank(SUPPLY_STANDARD_SIZES, a);
  const sb = fixedRank(SUPPLY_STANDARD_SIZES, b);
  if (sa !== sb) return sa - sb;
  return naturalCollator.compare(a, b);
}

type SizedVariantLike = {
  title?: string | null;
  metadata?: Record<string, unknown> | null;
};

// Staff-disabled sizes (variant.metadata.size_disabled) are withheld from the
// storefront entirely; the variant and its QuickBooks mapping stay intact.
export function isVariantDisabled(variant: SizedVariantLike): boolean {
  return variant?.metadata?.size_disabled === true;
}

export function visibleVariants<T extends SizedVariantLike>(
  variants: T[] | null | undefined,
): T[] {
  return (variants ?? []).filter((v) => !isVariantDisabled(v));
}

/**
 * Order a product's variants for display. Products without a size system keep
 * their existing order untouched (existing single/legacy variants unchanged).
 */
export function sortVariantsBySize<T extends SizedVariantLike>(
  variants: T[],
  system: SizeSystem | null,
  sizeOrder?: string[] | null,
): T[] {
  if (!system) return variants;
  return [...variants].sort((a, b) =>
    compareSizes(system, a.title ?? "", b.title ?? "", sizeOrder),
  );
}

type PricedVariantLike = SizedVariantLike & {
  calculated_price?: {
    calculated_amount: number;
    currency_code: string;
  } | null;
};

export type StartingPrice = {
  amount: number;
  currency: string;
  /** True when enabled sizes have different prices → render as "From $X". */
  isFrom: boolean;
};

/**
 * The price a listing card shows before any size is chosen: the lowest priced
 * enabled size, flagged `isFrom` when the sizes are not all the same price.
 */
export function getStartingPrice(
  variants: PricedVariantLike[] | null | undefined,
): StartingPrice | null {
  const priced = visibleVariants(variants).filter(
    (v) => typeof v.calculated_price?.calculated_amount === "number",
  );
  if (priced.length === 0) return null;
  const amounts = priced.map((v) => v.calculated_price!.calculated_amount);
  const min = Math.min(...amounts);
  const cheapest = priced.find(
    (v) => v.calculated_price!.calculated_amount === min,
  )!;
  return {
    amount: min,
    currency: cheapest.calculated_price!.currency_code,
    isFrom: new Set(amounts).size > 1,
  };
}

type StockedVariantLike = SizedVariantLike & {
  manage_inventory?: boolean | null;
  inventory_quantity?: number | null;
  allow_backorder?: boolean | null;
};

// A size stays visible in the dropdown when unavailable — just not selectable.
export function isVariantUnavailable(variant: StockedVariantLike): boolean {
  if (!variant?.manage_inventory) return false;
  if (variant.allow_backorder) return false;
  return (variant.inventory_quantity ?? 0) <= 0;
}

// "Out of Stock" for the whole product only when EVERY enabled size is gone.
export function allVariantsUnavailable(
  variants: StockedVariantLike[] | null | undefined,
): boolean {
  const enabled = visibleVariants(variants);
  if (enabled.length === 0) return false;
  return enabled.every((v) => isVariantUnavailable(v));
}
