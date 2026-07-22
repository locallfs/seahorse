import { NextResponse } from "next/server";

// Google Merchant Center product feed (RSS 2.0 with the g: namespace).
// SUPPLIES ONLY: Google suspends merchant accounts for live animals in feeds,
// so livestock is deliberately excluded — it gets found via product rich
// results in regular search instead (structured data on product pages).
export const revalidate = 3600;

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const SITE_URL = "https://www.seahorseaquariumsupply.com";
const BRAND = "Woody's Seahorse Aquarium & Supply";

type FeedVariant = {
  id: string;
  title: string;
  sku?: string | null;
  upc?: string | null;
  barcode?: string | null;
  manage_inventory?: boolean | null;
  inventory_quantity?: number | null;
  allow_backorder?: boolean | null;
  calculated_price?: { calculated_amount: number; currency_code: string };
};

type FeedProduct = {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  images?: { url: string }[] | null;
  variants: FeedVariant[];
};

async function storeGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Medusa ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function gtinOf(v: FeedVariant): string | undefined {
  const raw = (v.upc || v.barcode || "").trim();
  return /^\d{8}$|^\d{12,14}$/.test(raw) ? raw : undefined;
}

export async function GET() {
  console.log("[merchant-feed] start");
  try {
    const cats = await storeGet<{ product_categories?: { id: string }[] }>(
      "/store/product-categories?handle=supplies&fields=id"
    );
    const suppliesId = cats.product_categories?.[0]?.id;
    if (!suppliesId) throw new Error("supplies category not found");

    const regions = await storeGet<{ regions?: { id: string }[] }>(
      "/store/regions"
    );
    const regionId = regions.regions?.[0]?.id;

    const fields =
      "id,handle,title,description,thumbnail,*images,*variants,*variants.calculated_price,variants.sku,variants.upc,variants.barcode,variants.manage_inventory,variants.inventory_quantity,variants.allow_backorder";
    const products: FeedProduct[] = [];
    let offset = 0;
    while (offset < 5000) {
      const params = new URLSearchParams({
        limit: "100",
        offset: String(offset),
        fields,
        "category_id[]": suppliesId,
      });
      if (regionId) params.set("region_id", regionId);
      const data = await storeGet<{ products?: FeedProduct[]; count?: number }>(
        `/store/products?${params.toString()}`
      );
      const page = data.products ?? [];
      products.push(...page);
      offset += page.length;
      if (page.length === 0 || offset >= (data.count ?? products.length)) break;
    }

    const items: string[] = [];
    for (const p of products) {
      const image = p.images?.[0]?.url ?? p.thumbnail;
      if (!image) continue; // Google requires an image per item
      const description =
        (p.description ?? "").replace(/\s+/g, " ").trim() || p.title;
      for (const v of p.variants ?? []) {
        const price = v.calculated_price;
        if (!price || price.calculated_amount <= 0) continue;
        const inStock =
          v.manage_inventory === false ||
          v.allow_backorder === true ||
          (v.inventory_quantity ?? 0) > 0;
        const isDefault =
          !v.title || v.title === "Default" || v.title === "Default variant";
        const title = isDefault ? p.title : `${p.title} — ${v.title}`;
        const gtin = gtinOf(v);
        items.push(
          `<item>` +
            `<g:id>${esc(v.sku || v.id)}</g:id>` +
            `<g:title>${esc(title.slice(0, 150))}</g:title>` +
            `<g:description>${esc(description.slice(0, 5000))}</g:description>` +
            `<g:link>${esc(`${SITE_URL}/products/${p.handle}`)}</g:link>` +
            `<g:image_link>${esc(image)}</g:image_link>` +
            `<g:availability>${inStock ? "in_stock" : "out_of_stock"}</g:availability>` +
            `<g:price>${price.calculated_amount.toFixed(2)} ${price.currency_code.toUpperCase()}</g:price>` +
            `<g:condition>new</g:condition>` +
            `<g:brand>${esc(BRAND)}</g:brand>` +
            (gtin
              ? `<g:gtin>${gtin}</g:gtin>`
              : `<g:identifier_exists>no</g:identifier_exists>`) +
            `<g:google_product_category>${esc(
              "Animals & Pet Supplies > Pet Supplies > Fish Supplies"
            )}</g:google_product_category>` +
            `</item>`
        );
      }
    }

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">` +
      `<channel>` +
      `<title>${esc(BRAND)} — Supplies</title>` +
      `<link>${SITE_URL}</link>` +
      `<description>Aquarium supplies from ${esc(BRAND)}</description>` +
      items.join("") +
      `</channel></rss>`;

    console.log(`[merchant-feed] end — ${items.length} items`);
    return new NextResponse(xml, {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (err) {
    console.error("[merchant-feed] error", err);
    return new NextResponse("feed unavailable", { status: 503 });
  }
}
