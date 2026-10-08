/**
 * Pure search logic for the ReefNerds product list. No React Native or SDK
 * imports — this file is unit tested.
 *
 * Why any of this exists: `GET /admin/products?q=` in Medusa v2 is a single
 * contiguous `ILIKE '%whole phrase%'` over the Product model's own searchable
 * scalars (title, subtitle, description). No relation on the Product model is
 * marked `.searchable()`, so variant sku/upc/barcode/ean are never searched.
 * That means, straight out of the box:
 *   - "tang gem" finds nothing while "gem tang" finds one product
 *   - a title with a double space or a curly apostrophe is unreachable
 *   - barcodes and SKUs are unreachable
 * The helpers below close all three gaps on the client.
 */

/** Variant shape this module needs. Matches the admin API response. */
export type SearchableVariant = {
  title?: string | null;
  sku?: string | null;
  upc?: string | null;
  barcode?: string | null;
  ean?: string | null;
};

/** Product shape this module needs. Matches the admin API response. */
export type SearchableProduct = {
  title?: string | null;
  variants?: SearchableVariant[] | null;
};

/** Digits-only strings of retail-barcode length (UPC-E through GTIN-14). */
const BARCODE_RE = /^[0-9]{6,14}$/;

/**
 * Makes typed text and stored text comparable. Because the server match is a
 * contiguous ILIKE, a curly apostrophe or a stray double space in a stored
 * title is enough to make a product unfindable — 10 live products hit exactly
 * that. Folding both sides through here removes the whole class of misses.
 */
export function normalizeSearchText(value: string): string {
  return value
    // typographic apostrophes -> ASCII '
    .replace(/[‘’ʼ′]/g, "'")
    // curly double quotes -> ASCII "
    .replace(/[“”″]/g, '"')
    // en/em/figure dashes and the minus sign -> ASCII -
    .replace(/[‐-―−]/g, '-')
    // non-breaking, thin and zero-width spaces -> plain space
    .replace(/[    ​]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** The words a typed query has to match, in any order. */
export function searchTokens(normalized: string): string[] {
  return normalized.split(' ').filter(Boolean);
}

/**
 * Everything a result has to contain: the whitespace-separated words plus the
 * alphanumeric runs inside them. The runs matter for codes — a SKU like
 * "WS-AI-AXIS-20-CENTRIFUGAL-PUMP" is one word, so without them the only term
 * sent to the server is "centrifugal" and every product whose description
 * mentions a centrifugal pump comes back alongside the real match.
 *
 * Results are always filtered against the title, never the description.
 */
export function filterTokens(normalized: string): string[] {
  const words = searchTokens(normalized);
  const runs = normalized.split(/[^a-z0-9]+/).filter((r) => r.length >= 2);
  return Array.from(new Set([...words, ...runs]));
}

/**
 * The single word handed to the server. Sending the whole phrase finds nothing
 * when the words are reordered, so we send the longest alphanumeric run — it is
 * the most selective term available and keeps the server result set small. Runs
 * are split on punctuation so "sally's" probes as "sally", which still matches
 * a title stored with a curly apostrophe.
 */
export function serverProbe(normalized: string): string {
  const runs = normalized.split(/[^a-z0-9]+/).filter((r) => r.length >= 2);
  if (!runs.length) return normalized;
  return runs.reduce((longest, r) => (r.length > longest.length ? r : longest));
}

/** True when the query is a bare retail barcode (spaces and dashes ignored). */
export function isBarcodeLike(normalized: string): boolean {
  return BARCODE_RE.test(normalized.replace(/[\s-]/g, ''));
}

/** Everything about a product a human might type: name, sizes, and codes. */
export function productHaystack(p: SearchableProduct): string {
  const parts: string[] = [p.title || ''];
  for (const v of p.variants || []) {
    if (v.title) parts.push(v.title);
    if (v.sku) parts.push(v.sku);
    if (v.upc) parts.push(v.upc);
    if (v.barcode) parts.push(v.barcode);
    if (v.ean) parts.push(v.ean);
  }
  return normalizeSearchText(parts.join(' '));
}

/** Every word present somewhere in the product, order irrelevant. */
export function matchesAllTokens(p: SearchableProduct, tokens: string[]): boolean {
  const hay = productHaystack(p);
  return tokens.every((t) => hay.includes(t));
}

/**
 * How well a product answers the query — higher is a better answer.
 *
 * Partial typing works because every match is a substring match, so ordering is
 * what decides whether a search feels right: typing "leop" should put "Leopard
 * Wrasse" above a product that only contains those letters mid-word.
 *
 *   5  the title starts with everything that was typed  ("gem ta" -> "Gem Tang")
 *   4  the full typed phrase appears inside the title
 *   3  every typed word starts a word in the title      ("leop wras")
 *   2  every typed word appears somewhere in the title
 *   1  matched on a size name, SKU, UPC or barcode
 *   0  no title or code match — filtered out before it reaches the list
 */
export function matchScore(
  p: SearchableProduct,
  normalized: string,
  tokens: string[],
): number {
  if (!normalized) return 0;
  const title = normalizeSearchText(p.title || '');
  if (title.startsWith(normalized)) return 5;
  if (title.includes(normalized)) return 4;
  const titleWords = title.split(' ').filter(Boolean);
  if (tokens.every((t) => titleWords.some((w) => w.startsWith(t)))) return 3;
  if (tokens.every((t) => title.includes(t))) return 2;
  if (matchesAllTokens(p, tokens)) return 1;
  return 0;
}
