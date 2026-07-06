const CDN_BASE = process.env.NEXT_PUBLIC_CDN_URL ?? "";
const WEBSITE_CDN_BASE = process.env.NEXT_PUBLIC_WEBSITE_CDN_URL ?? "";

function build(base: string, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (!base) return clean;
  return `${base.replace(/\/$/, "")}${encodeURI(clean)}`;
}

export function websiteCdn(path: string): string {
  return build(WEBSITE_CDN_BASE || CDN_BASE, path);
}
