// Alphabetical ordering for customer-facing browse lists.
//
// Rules: case-insensitive, leading/trailing whitespace ignored, natural
// ("human") ordering for names containing numbers ("Zoa 2" before "Zoa 10").
// Identical product titles tie-break on first variant title, then product id,
// so ordering is fully stable everywhere it is used.
//
// SCOPE: actual storefront browse/listing pages only. Rotating galleries,
// homepage carousels, and other curated displays keep their curated order and
// must NOT import this module.

const collator = new Intl.Collator("en", {
  numeric: true, // natural sorting: 2 before 10
  sensitivity: "base", // case-insensitive
});

export function compareNames(a: string | null | undefined, b: string | null | undefined): number {
  return collator.compare((a ?? "").trim(), (b ?? "").trim());
}

type SortableProduct = {
  id: string;
  title: string;
  variants?: Array<{ title?: string | null; [key: string]: unknown }> | null;
};

// A→Z by customer-visible title; identical titles fall back to the first
// variant title, then the product id (stable, deterministic).
export function sortProductsAlpha<T extends SortableProduct>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const byTitle = compareNames(a.title, b.title);
    if (byTitle !== 0) return byTitle;
    const byVariant = compareNames(a.variants?.[0]?.title, b.variants?.[0]?.title);
    if (byVariant !== 0) return byVariant;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

// Generic A→Z for named lists (categories, tags, filter options, brands…).
export function sortByName<T>(items: T[], name: (item: T) => string): T[] {
  return [...items].sort((a, b) => compareNames(name(a), name(b)));
}
