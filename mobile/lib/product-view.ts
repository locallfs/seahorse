// Pure product/variant view logic for the ReefNerds app — no imports, so the
// repo's vitest suite can exercise it directly. Products may now carry
// multiple size variants (backend size-variant system): every helper here is
// multi-variant aware, filters the sale price list out of base prices, and
// respects staff-disabled sizes (variant.metadata.size_disabled).

export type PriceRowLike = {
  amount?: number | null;
  currency_code?: string | null;
  price_list_id?: string | null;
};

export type LevelLike = {
  stocked_quantity?: number | null;
  reserved_quantity?: number | null;
};

export type VariantLike = {
  id?: string;
  title?: string | null;
  manage_inventory?: boolean | null;
  metadata?: Record<string, unknown> | null;
  prices?: PriceRowLike[] | null;
  inventory_items?: Array<{
    inventory?: { id?: string; location_levels?: LevelLike[] | null } | null;
  }> | null;
};

/**
 * The variant's BASE price: sale-price-list rows (price_list_id set) are
 * excluded so the app never displays — or worse, writes back — a sale price
 * as the regular price. Prefers USD.
 */
export function baseVariantPrice(
  variant: VariantLike | null | undefined,
): { amount: number; currency: string } | null {
  const rows = (variant?.prices ?? []).filter(
    (p) => p && p.amount != null && p.price_list_id == null,
  );
  if (rows.length === 0) return null;
  const usd =
    rows.find((p) => (p.currency_code ?? '').toLowerCase() === 'usd') ?? rows[0];
  return {
    amount: Number(usd.amount),
    currency: (usd.currency_code ?? 'usd').toLowerCase(),
  };
}

/** Available stock (stocked − reserved) across one variant's inventory. */
export function variantStock(variant: VariantLike | null | undefined): number {
  let total = 0;
  for (const link of variant?.inventory_items ?? []) {
    for (const lvl of link?.inventory?.location_levels ?? []) {
      total +=
        Number(lvl?.stocked_quantity ?? 0) - Number(lvl?.reserved_quantity ?? 0);
    }
  }
  return total;
}

export function isSizeDisabled(variant: VariantLike | null | undefined): boolean {
  return variant?.metadata?.size_disabled === true;
}

export type ProductStockSummary = {
  /** Sum of available stock across every tracked, non-hidden size. */
  stock: number;
  /** True when at least one size is untracked → product can't sell out. */
  hasUnlimited: boolean;
  /** True when NO size tracks inventory. */
  allUnlimited: boolean;
};

export function productStockSummary(
  variants: VariantLike[] | null | undefined,
): ProductStockSummary {
  const active = (variants ?? []).filter((v) => !isSizeDisabled(v));
  let stock = 0;
  let unmanaged = 0;
  for (const v of active) {
    if (v?.manage_inventory === false) {
      unmanaged++;
    } else {
      stock += variantStock(v);
    }
  }
  return {
    stock,
    hasUnlimited: unmanaged > 0,
    allUnlimited: active.length > 0 && unmanaged === active.length,
  };
}

export type ProductPriceSummary = {
  amount: number;
  currency: string;
  /** True when enabled sizes have different base prices → render "From". */
  isFrom: boolean;
};

export function productPriceSummary(
  variants: VariantLike[] | null | undefined,
): ProductPriceSummary | null {
  const priced = (variants ?? [])
    .filter((v) => !isSizeDisabled(v))
    .map((v) => baseVariantPrice(v))
    .filter((p): p is { amount: number; currency: string } => p !== null);
  if (priced.length === 0) return null;
  const min = priced.reduce((a, b) => (b.amount < a.amount ? b : a));
  return {
    amount: min.amount,
    currency: min.currency,
    isFrom: new Set(priced.map((p) => p.amount)).size > 1,
  };
}

/** Human label for a size row in the picker. */
export function variantLabel(variant: VariantLike | null | undefined): string {
  const title = (variant?.title ?? '').trim();
  const label = title || 'Default';
  return isSizeDisabled(variant) ? `${label} (hidden)` : label;
}
