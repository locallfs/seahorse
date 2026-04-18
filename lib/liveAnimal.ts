export const LIVE_CATEGORY_HANDLES = ["fish", "corals", "inverts"];

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
    (c) => !!c?.handle && LIVE_CATEGORY_HANDLES.includes(c.handle),
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
