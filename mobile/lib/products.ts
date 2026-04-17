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
  const { products } = await sdk.admin.product.list({
    q: search || undefined,
    limit: 100,
    fields:
      'id,title,status,thumbnail,*variants,*variants.prices,*variants.inventory_items.inventory.location_levels',
  } as any);

  const mapped: ProductSummary[] = (products || []).map((p: any) => {
    const variant = p.variants?.[0];
    const { amount, currency } = firstVariantPrice(variant || {});
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      thumbnail: p.thumbnail || null,
      price: amount,
      currency,
      stock: variant ? sumVariantStock(variant) : 0,
      variantId: variant?.id || null,
    };
  });

  // Priority buckets (lower = higher priority):
  // In-stock always beats out-of-stock, regardless of publish state.
  // 0: Published + in stock
  // 1: Draft + in stock
  // 2: Published + out of stock
  // 3: Draft + out of stock
  const bucket = (p: ProductSummary) => {
    const published = p.status === 'published';
    const inStock = p.stock > 0;
    if (inStock && published) return 0;
    if (inStock && !published) return 1;
    if (!inStock && published) return 2;
    return 3;
  };
  mapped.sort((a, b) => {
    const ba = bucket(a);
    const bb = bucket(b);
    if (ba !== bb) return ba - bb;
    return a.title.localeCompare(b.title);
  });
  return mapped;
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

export type NewProductInput = {
  title: string;
  description: string;
  priceUsd: number;
  stock: number;
  published: boolean;
  thumbnail?: { uri: string; name: string; type: string } | null;
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
    options: [{ title: 'Default', values: ['Default'] }],
    variants: [
      {
        title: 'Default',
        manage_inventory: true,
        options: { Default: 'Default' },
        prices: [{ amount: input.priceUsd, currency_code: 'usd' }],
      },
    ],
  };
  if (defaults.shippingProfileId) payload.shipping_profile_id = defaults.shippingProfileId;
  if (defaults.salesChannelId) payload.sales_channels = [{ id: defaults.salesChannelId }];

  const { product } = await sdk.admin.product.create(payload);

  if (input.stock > 0 && defaults.stockLocationId) {
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
