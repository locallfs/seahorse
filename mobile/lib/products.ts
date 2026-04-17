import { sdk } from './medusa';
import { uploadImage } from './uploads';

export type ProductSummary = {
  id: string;
  title: string;
  status: 'draft' | 'proposed' | 'published' | 'rejected';
  thumbnail: string | null;
  price: number | null;
  currency: string;
  stock: number;
  manageInventory: boolean;
  variantId: string | null;
};

export const LOW_STOCK_THRESHOLD = 3;

function firstVariantPrice(variant: any): { amount: number | null; currency: string } {
  const prices = variant?.prices || variant?.calculated_price ? [variant.calculated_price] : variant?.prices || [];
  if (variant?.calculated_price?.calculated_amount != null) {
    return {
      amount: variant.calculated_price.calculated_amount,
      currency: variant.calculated_price.currency_code || 'usd',
    };
  }
  const usd = prices.find((p: any) => p?.currency_code === 'usd') || prices[0];
  return { amount: usd?.amount ?? null, currency: usd?.currency_code || 'usd' };
}

function sumVariantStock(variant: any): number {
  const items = variant?.inventory_items || [];
  let total = 0;
  for (const link of items) {
    const levels = link?.inventory?.location_levels || [];
    for (const lvl of levels) {
      total += Number(lvl.stocked_quantity ?? 0) - Number(lvl.reserved_quantity ?? 0);
    }
  }
  return total;
}

export async function listProducts(search?: string): Promise<ProductSummary[]> {
  const fields =
    'id,title,status,thumbnail,*variants,*variants.prices,*variants.inventory_items.inventory.location_levels';
  const pageSize = 200;
  const all: any[] = [];
  let offset = 0;
  // Pull every page so client-side sort sees the whole catalog, not just page 1.
  while (true) {
    const res = (await sdk.admin.product.list({
      q: search || undefined,
      limit: pageSize,
      offset,
      fields,
    } as any)) as any;
    const batch: any[] = res.products || [];
    all.push(...batch);
    const total = typeof res.count === 'number' ? res.count : all.length;
    offset += batch.length;
    if (batch.length === 0 || offset >= total) break;
  }
  const products = all;

  const mapped: ProductSummary[] = (products || []).map((p: any) => {
    const variant = p.variants?.[0];
    const { amount, currency } = firstVariantPrice(variant || {});
    const manageInventory = variant?.manage_inventory ?? true;
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      thumbnail: p.thumbnail || null,
      price: amount,
      currency,
      stock: variant && manageInventory ? sumVariantStock(variant) : 0,
      manageInventory,
      variantId: variant?.id || null,
    };
  });

  return mapped;
}

export type SortMode = 'priority' | 'stock' | 'alpha';

// Priority: Published first, stock tier second, alphabetical last.
// 0: Published + unlimited | 1: Published + in-stock | 2: Published + OOS
// 3: Draft + unlimited    | 4: Draft + in-stock    | 5: Draft + OOS
function priorityBucket(p: ProductSummary): number {
  const publishedOffset = p.status === 'published' ? 0 : 3;
  if (!p.manageInventory) return publishedOffset + 0;
  if (p.stock > 0) return publishedOffset + 1;
  return publishedOffset + 2;
}

// Stock-first: unlimited > in-stock > out-of-stock, published within each.
function stockBucket(p: ProductSummary): number {
  const publishedOffset = p.status === 'published' ? 0 : 1;
  if (!p.manageInventory) return 0 + publishedOffset;
  if (p.stock > 0) return 2 + publishedOffset;
  return 4 + publishedOffset;
}

export function sortProducts(items: ProductSummary[], mode: SortMode): ProductSummary[] {
  const copy = [...items];
  if (mode === 'alpha') {
    copy.sort((a, b) => a.title.localeCompare(b.title));
    return copy;
  }
  const bucket = mode === 'stock' ? stockBucket : priorityBucket;
  copy.sort((a, b) => {
    const diff = bucket(a) - bucket(b);
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title);
  });
  return copy;
}

type Defaults = {
  shippingProfileId: string | null;
  salesChannelId: string | null;
  stockLocationId: string | null;
};

let defaultsCache: Defaults | null = null;

export async function getStoreDefaults(): Promise<Defaults> {
  if (defaultsCache) return defaultsCache;
  const [profiles, channels, locations] = await Promise.all([
    sdk.admin.shippingProfile.list({ limit: 1 } as any).catch(() => ({ shipping_profiles: [] })),
    sdk.admin.salesChannel.list({ limit: 1 } as any).catch(() => ({ sales_channels: [] })),
    sdk.admin.stockLocation.list({ limit: 1 } as any).catch(() => ({ stock_locations: [] })),
  ]);
  defaultsCache = {
    shippingProfileId: (profiles as any).shipping_profiles?.[0]?.id || null,
    salesChannelId: (channels as any).sales_channels?.[0]?.id || null,
    stockLocationId: (locations as any).stock_locations?.[0]?.id || null,
  };
  return defaultsCache;
}

export type OrganizeOption = { id: string; label: string };

export type OrganizeOptions = {
  tags: OrganizeOption[];
  types: OrganizeOption[];
  collections: OrganizeOption[];
  categories: OrganizeOption[];
};

export async function listOrganizeOptions(): Promise<OrganizeOptions> {
  const [tagsRes, typesRes, collectionsRes, categoriesRes] = await Promise.all([
    sdk.admin.productTag.list({ limit: 200 } as any).catch(() => ({ product_tags: [] })),
    sdk.admin.productType.list({ limit: 200 } as any).catch(() => ({ product_types: [] })),
    sdk.admin.productCollection.list({ limit: 200 } as any).catch(() => ({ collections: [] })),
    sdk.admin.productCategory.list({ limit: 200 } as any).catch(() => ({ product_categories: [] })),
  ]);
  return {
    tags: ((tagsRes as any).product_tags || []).map((t: any) => ({ id: t.id, label: t.value })),
    types: ((typesRes as any).product_types || []).map((t: any) => ({ id: t.id, label: t.value })),
    collections: ((collectionsRes as any).collections || []).map((c: any) => ({ id: c.id, label: c.title })),
    categories: ((categoriesRes as any).product_categories || []).map((c: any) => ({ id: c.id, label: c.name })),
  };
}

export const COUNTRY_OF_ORIGIN = 'us';
export const COUNTRY_OF_ORIGIN_LABEL = 'United States';

export type ProductAttributes = {
  height: number | null;
  width: number | null;
  length: number | null;
  weight: number | null;
};

export type ProductOrganize = {
  tagIds: string[];
  typeId: string | null;
  collectionId: string | null;
  categoryIds: string[];
};

export type NewProductInput = {
  title: string;
  description: string;
  priceUsd: number;
  stock: number;
  published: boolean;
  manageInventory: boolean;
  thumbnail?: { uri: string; name: string; type: string } | null;
  organize?: ProductOrganize;
  attributes?: ProductAttributes;
};

export async function createProduct(input: NewProductInput): Promise<string> {
  const defaults = await getStoreDefaults();

  let thumbnailUrl: string | undefined;
  if (input.thumbnail) {
    const url = await uploadImage(input.thumbnail);
    if (url) thumbnailUrl = url;
  }

  const payload: any = {
    title: input.title,
    description: input.description,
    status: input.published ? 'published' : 'draft',
    thumbnail: thumbnailUrl,
    origin_country: COUNTRY_OF_ORIGIN,
    options: [{ title: 'Default', values: ['Default'] }],
    variants: [
      {
        title: 'Default',
        manage_inventory: input.manageInventory,
        options: { Default: 'Default' },
        prices: [{ amount: input.priceUsd, currency_code: 'usd' }],
      },
    ],
  };
  if (defaults.shippingProfileId) payload.shipping_profile_id = defaults.shippingProfileId;
  if (defaults.salesChannelId) payload.sales_channels = [{ id: defaults.salesChannelId }];

  if (input.organize) {
    if (input.organize.tagIds.length) {
      payload.tags = input.organize.tagIds.map((id) => ({ id }));
    }
    if (input.organize.typeId) payload.type_id = input.organize.typeId;
    if (input.organize.collectionId) payload.collection_id = input.organize.collectionId;
    if (input.organize.categoryIds.length) {
      payload.categories = input.organize.categoryIds.map((id) => ({ id }));
    }
  }
  if (input.attributes) {
    if (input.attributes.height != null) payload.height = input.attributes.height;
    if (input.attributes.width != null) payload.width = input.attributes.width;
    if (input.attributes.length != null) payload.length = input.attributes.length;
    if (input.attributes.weight != null) payload.weight = input.attributes.weight;
  }

  const { product } = await sdk.admin.product.create(payload);

  if (input.manageInventory && input.stock > 0 && defaults.stockLocationId) {
    const { product: full } = await sdk.admin.product.retrieve(product.id, {
      fields: '*variants.inventory_items',
    } as any);
    const link = (full as any).variants?.[0]?.inventory_items?.[0];
    const inventoryId = link?.inventory?.id || link?.inventory_item_id;
    if (inventoryId) {
      try {
        await sdk.admin.inventoryItem.batchUpdateLevels(inventoryId, {
          create: [
            {
              location_id: defaults.stockLocationId,
              stocked_quantity: input.stock,
            },
          ],
        });
      } catch (err) {
        console.warn('Could not set initial stock level.', err);
      }
    }
  }

  return product.id;
}

export function formatPrice(amount: number | null, currency = 'usd'): string {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}
