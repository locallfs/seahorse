export const LIVE_CATEGORY_HANDLES = [
  "fish",
  "corals",
  "inverts",
  // alternate / legacy handles that also denote live animals
  "coral",
  "saltwater-fish",
  "invertebrates",
  "seahorses",
];

export const LIVE_KEYWORDS = [
  "fish",
  "coral",
  "invert",
  "shrimp",
  "crab",
  "snail",
  "anemone",
  "seahorse",
  "clown",
  "tang",
  "wrasse",
  "goby",
  "angel",
  "urchin",
  "starfish",
  // common coral names
  "torch",
  "hammer",
  "duncan",
  "frogspawn",
  "acro",
  "zoa",
  "zoanthid",
  "mushroom",
  "monti",
  "chalice",
  "euphyllia",
  "gonio",
  "blasto",
  "candy cane",
  "leather",
  "xenia",
  "scoly",
];

type CategoryLike = { handle?: string | null } | null | undefined;

type ProductLike = {
  title?: string | null;
  categories?: CategoryLike[] | null;
} | null | undefined;

export function isLiveAnimalByCategories(
  categories: CategoryLike[] | null | undefined,
): boolean {
  if (!categories?.length) return false;
  return categories.some(
    (c) => !!c?.handle && LIVE_CATEGORY_HANDLES.includes(c.handle.toLowerCase()),
  );
}

export function isLiveAnimalByTitle(
  title: string | null | undefined,
): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  return LIVE_KEYWORDS.some((kw) => t.includes(kw));
}

// Category membership is the source of truth.
// Title keyword match stays as a fallback for products that haven't
// been categorized yet (legacy rows created before the picker existed).
export function isLiveAnimal(
  productOrTitle: ProductLike | string | null | undefined,
): boolean {
  if (!productOrTitle) return false;
  if (typeof productOrTitle === "string") {
    return isLiveAnimalByTitle(productOrTitle);
  }
  if (isLiveAnimalByCategories(productOrTitle.categories)) return true;
  return isLiveAnimalByTitle(productOrTitle.title);
}

type CartItemLike = {
  product_handle?: string | null;
  product_title?: string | null;
  title?: string | null;
  variant?: { product?: { handle?: string | null } | null } | null;
} | null | undefined;

// Keyword check for a cart line item — matches the product handle OR title.
// Cart and checkout both use this so they classify a product identically.
export function isLiveAnimalItemByText(item: CartItemLike): boolean {
  if (!item) return false;
  const handle = item.product_handle || item.variant?.product?.handle || null;
  const title = item.product_title || item.title || null;
  return isLiveAnimalByTitle(handle) || isLiveAnimalByTitle(title);
}

const CORAL_TITLE_KEYWORDS = ["coral", "zoa", "acan", "monti", "acro"];

type CoralProductLike = {
  title?: string | null;
  categories?: CategoryLike[] | null;
  tags?: Array<{ value?: string | null }> | null;
} | null | undefined;

export function isCoral(product: CoralProductLike): boolean {
  if (!product) return false;
  if (product.categories?.some((c) => c?.handle === "corals")) return true;
  const tagMatch = product.tags?.some((t) =>
    typeof t?.value === "string" &&
    ["coral", "corals", "wysiwyg corals", "wysiwyg coral"].includes(
      t.value.toLowerCase().trim(),
    ),
  );
  if (tagMatch) return true;
  const title = (product.title ?? "").toLowerCase();
  return CORAL_TITLE_KEYWORDS.some((kw) => title.includes(kw));
}

export const CORAL_WATER_CONDITIONS = [
  { label: "Calcium", value: "420-480 ppm" },
  { label: "Magnesium", value: "1350-1500 ppm" },
  { label: "Alkalinity", value: "8-12 dKH" },
  { label: "Nitrates", value: "5-35 ppm" },
  { label: "Phosphates", value: "0.03-1.0 ppm" },
  { label: "Temperature", value: "76-80 °F" },
  { label: "PH", value: "7.8-8.4" },
  { label: "Salinity", value: "1.024-1.027" },
] as const;
