/* eslint-disable @typescript-eslint/no-explicit-any */
// Server-side Medusa Store API helpers for the chatbot.
// Public data uses the publishable key; a customer's own orders use their
// bearer token (passed from the browser, never exposed to the AI model).

const BACKEND =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

function storeHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "x-publishable-api-key": PUBLISHABLE_KEY,
    "Content-Type": "application/json",
    ...extra,
  };
}

let cachedRegionId: string | null = null;
async function getRegionId(): Promise<string | null> {
  if (cachedRegionId) return cachedRegionId;
  try {
    const res = await fetch(`${BACKEND}/store/regions`, {
      headers: storeHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    cachedRegionId = data.regions?.[0]?.id ?? null;
    return cachedRegionId;
  } catch {
    return null;
  }
}

type Variant = {
  manage_inventory?: boolean | null;
  inventory_quantity?: number | null;
  allow_backorder?: boolean | null;
  calculated_price?: {
    calculated_amount?: number;
    currency_code?: string;
  } | null;
};

function variantInStock(v: Variant): boolean {
  if (!v?.manage_inventory) return true;
  if (v.allow_backorder) return true;
  return (v.inventory_quantity ?? 0) > 0;
}

export type ProductStock = {
  title: string;
  inStock: boolean;
  price: number | null;
  currency: string | null;
};

export async function searchProducts(query: string): Promise<ProductStock[]> {
  const regionId = await getRegionId();
  const params = new URLSearchParams({
    q: query,
    limit: "5",
    fields:
      "id,title,handle,*variants.calculated_price,variants.manage_inventory,variants.inventory_quantity,variants.allow_backorder",
  });
  if (regionId) params.set("region_id", regionId);

  const res = await fetch(`${BACKEND}/store/products?${params.toString()}`, {
    headers: storeHeaders(),
  });
  if (!res.ok) throw new Error(`product search failed (${res.status})`);
  const data = await res.json();
  const products: any[] = data.products || [];

  return products.map((p) => {
    const variants: Variant[] = p.variants || [];
    const inStock =
      variants.length === 0 ? false : variants.some(variantInStock);
    const priced = variants.find(
      (v) => v.calculated_price?.calculated_amount != null
    );
    return {
      title: p.title,
      inStock,
      price: priced?.calculated_price?.calculated_amount ?? null,
      currency: priced?.calculated_price?.currency_code ?? null,
    };
  });
}

export type OrderSummary = {
  display_id: number | string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  email?: string;
  items: { title: string; quantity: number }[];
};

function toSummary(o: any): OrderSummary {
  return {
    display_id: o.display_id,
    status: o.status || "processing",
    total: o.total ?? 0,
    currency: (o.currency_code || "usd").toUpperCase(),
    created_at: o.created_at,
    email: o.email,
    items: (o.items || []).map((it: any) => ({
      title: it.product_title || it.title || "item",
      quantity: it.quantity ?? 1,
    })),
  };
}

export async function listCustomerOrders(
  token: string
): Promise<OrderSummary[]> {
  const params = new URLSearchParams({
    limit: "10",
    fields: "id,display_id,created_at,total,status,currency_code,*items",
  });
  const res = await fetch(`${BACKEND}/store/orders?${params.toString()}`, {
    headers: storeHeaders({ Authorization: `Bearer ${token}` }),
  });
  if (!res.ok) throw new Error(`orders fetch failed (${res.status})`);
  const data = await res.json();
  return (data.orders || []).map(toSummary);
}

export async function retrieveOrder(id: string): Promise<OrderSummary | null> {
  const params = new URLSearchParams({
    fields: "id,display_id,created_at,total,status,currency_code,email,*items",
  });
  const res = await fetch(
    `${BACKEND}/store/orders/${encodeURIComponent(id)}?${params.toString()}`,
    { headers: storeHeaders() }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.order ? toSummary(data.order) : null;
}
