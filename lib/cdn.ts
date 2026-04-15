const CDN_BASE = process.env.NEXT_PUBLIC_CDN_URL ?? "";

export function cdn(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (!CDN_BASE) return clean;
  return `${CDN_BASE.replace(/\/$/, "")}${encodeURI(clean)}`;
}
