const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

const PRODUCT_FIELDS =
  "id,handle,title,description,thumbnail,metadata,*images,*options,*variants,*variants.calculated_price,*variants.options,*categories,variants.manage_inventory,variants.inventory_quantity,variants.allow_backorder";

type RegionsResponse = {
  regions?: { id: string }[];
};

type Variant = {
  id: string;
  title: string;
  sku?: string | null;
  calculated_price?: {
    calculated_amount: number;
    currency_code: string;
  };
  options?: { value: string; option_id?: string | null }[] | null;
  manage_inventory?: boolean | null;
  inventory_quantity?: number | null;
  allow_backorder?: boolean | null;
};

type ProductImage = { id: string; url: string; rank?: number };

type Pads = {
  care_level?: string;
  reef_safe?: string;
  min_tank_size?: string;
  max_size?: string;
  diet?: string;
  temperament?: string;
  range?: string;
  flow?: string[];
  placement?: string[];
  lighting?: string[];
  calcium?: string;
  magnesium?: string;
  alkalinity?: string;
  nitrates?: string;
  phosphates?: string;
  temperature?: string;
  ph?: string;
  salinity?: string;
};

export type StoreProduct = {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  images?: ProductImage[] | null;
  variants: Variant[];
  options?: { id: string; title: string }[] | null;
  metadata?: { pads?: Pads } | null;
  categories?: { id: string; handle: string }[] | null;
};

type ProductsResponse = {
  products?: StoreProduct[];
};

async function storeRequest<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: {
      "x-publishable-api-key": PUBLISHABLE_KEY,
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`Medusa request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

type ProductHandleResponse = {
  products?: Array<{ handle: string; updated_at?: string }>;
  count?: number;
};

export async function getAllProductHandles(): Promise<
  Array<{ handle: string; updated_at?: string }>
> {
  try {
    const pageSize = 200;
    const collected: Array<{ handle: string; updated_at?: string }> = [];
    let offset = 0;
    while (offset < 10000) {
      const data = await storeRequest<ProductHandleResponse>(
        `/store/products?fields=handle,updated_at&limit=${pageSize}&offset=${offset}`
      );
      const page = data.products ?? [];
      collected.push(...page);
      const total = typeof data.count === "number" ? data.count : collected.length;
      offset += page.length;
      if (page.length === 0 || offset >= total) break;
    }
    return collected;
  } catch (err) {
    console.warn("[products-server] handles fetch failed", err);
    return [];
  }
}

export async function getProductByHandle(
  handle: string
): Promise<StoreProduct | null> {
  try {
    const regions = await storeRequest<RegionsResponse>("/store/regions");
    const regionId = regions.regions?.[0]?.id;
    const query = new URLSearchParams({
      handle,
      fields: PRODUCT_FIELDS,
    });
    if (regionId) query.set("region_id", regionId);
    const data = await storeRequest<ProductsResponse>(
      `/store/products?${query.toString()}`
    );
    return data.products?.[0] ?? null;
  } catch (err) {
    console.warn("[products-server] fetch failed", err);
    return null;
  }
}
