const PREFIX = "WS-";

export function slugifySku(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildSkuBase(
  productTitle: string,
  productHandle: string | null,
): string {
  const source =
    productHandle && productHandle.trim().length > 0
      ? productHandle
      : productTitle;
  const slug = slugifySku(source);
  return slug.length > 0 ? `${PREFIX}${slug}` : `${PREFIX}ITEM`;
}

export function buildVariantSku(
  productTitle: string,
  productHandle: string | null,
  variantIndex: number,
  variantCount: number,
  taken: Set<string>,
): string {
  const base = buildSkuBase(productTitle, productHandle);
  const suffix =
    variantCount > 1 ? `-V${String(variantIndex + 1).padStart(2, "0")}` : "";
  let candidate = `${base}${suffix}`;
  let n = 1;
  while (taken.has(candidate)) {
    n++;
    candidate = `${base}${suffix}-${String(n).padStart(2, "0")}`;
  }
  taken.add(candidate);
  return candidate;
}
