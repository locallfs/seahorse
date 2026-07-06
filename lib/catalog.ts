/* eslint-disable @typescript-eslint/no-explicit-any */
import { medusa } from "@/lib/medusa";

// The homepage renders several tag-filtered galleries. Each one used to fetch
// the entire product catalog separately (up to ~7 full fetches per visit).
// This shares a single catalog fetch across all of them, with a short TTL so
// stock/price stay reasonably fresh.
const TTL_MS = 5 * 60_000;
let cache: { at: number; promise: Promise<any[]> } | null = null;

async function fetchAllProducts(): Promise<any[]> {
  const regionsRes = await medusa.store.region.list();
  const regionId = regionsRes.regions?.[0]?.id;

  const pageSize = 200;
  const collected: any[] = [];
  let offset = 0;
  while (true) {
    const res = await medusa.store.product.list({
      fields:
        "id,handle,title,thumbnail,tags.value,*images,*categories,*variants,*variants.calculated_price,variants.manage_inventory,variants.inventory_quantity,variants.allow_backorder",
      region_id: regionId,
      limit: pageSize,
      offset,
    } as any);
    const page = (res.products as any[]) || [];
    collected.push(...page);
    const total =
      typeof (res as any).count === "number"
        ? (res as any).count
        : collected.length;
    offset += page.length;
    if (page.length === 0 || offset >= total) break;
    if (offset > 5000) break;
  }
  return collected;
}

export function getAllStoreProducts(): Promise<any[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.promise;

  const promise = fetchAllProducts();
  // On failure, drop the cache so a later mount can retry.
  promise.catch(() => {
    if (cache?.promise === promise) cache = null;
  });
  cache = { at: now, promise };
  return promise;
}
