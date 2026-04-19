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
  categoriesByHandle: Record<string, OrganizeOption & { handle: string }>;
};

export type ProductTypeKey = 'fish' | 'corals' | 'inverts' | 'supplies';

export const PRODUCT_TYPE_OPTIONS: Array<{
  key: ProductTypeKey;
  label: string;
  handle: string;
}> = [
  { key: 'fish', label: 'Fish', handle: 'fish' },
  { key: 'corals', label: 'Corals', handle: 'corals' },
  { key: 'inverts', label: 'Inverts', handle: 'inverts' },
  { key: 'supplies', label: 'Supplies', handle: 'supplies' },
];

export const LIVE_TYPE_KEYS: ProductTypeKey[] = ['fish', 'corals', 'inverts'];
export const NEW_ARRIVALS_HANDLE = 'new-arrivals';

export function isLiveType(key: ProductTypeKey | null): boolean {
  return !!key && LIVE_TYPE_KEYS.includes(key);
}

export type SpeciesPads = {
  care_level: string;
  reef_safe: string;
  min_tank_size: string;
  max_size: string;
  diet: string;
  temperament: string;
  range: string;
  flow: string[];
  placement: string[];
  lighting: string[];
  calcium: string;
  magnesium: string;
  alkalinity: string;
  nitrates: string;
  phosphates: string;
  temperature: string;
  ph: string;
  salinity: string;
};

export const FLOW_OPTIONS = [
  'Low',
  'Low to Moderate',
  'Moderate',
  'Moderate to High',
  'Heavy',
  'Indirect',
  'Direct',
];
export const PLACEMENT_OPTIONS = ['Low', 'Mid-Low', 'Mid', 'Mid-High', 'High'];
export const LIGHTING_OPTIONS = [
  'Low',
  'Low to Moderate',
  'Moderate',
  'Moderate to High',
  'High',
];

export const WATER_PARAM_FIELDS: Array<{
  key: keyof SpeciesPads;
  label: string;
  placeholder: string;
}> = [
  { key: 'calcium', label: 'Calcium', placeholder: 'e.g. 420 ppm' },
  { key: 'magnesium', label: 'Magnesium', placeholder: 'e.g. 1350 ppm' },
  { key: 'alkalinity', label: 'Alkalinity', placeholder: 'e.g. 8-10 dKH' },
  { key: 'nitrates', label: 'Nitrates', placeholder: 'e.g. < 10 ppm' },
  { key: 'phosphates', label: 'Phosphates', placeholder: 'e.g. < 0.05 ppm' },
  { key: 'temperature', label: 'Temperature', placeholder: 'e.g. 75-78°F' },
  { key: 'ph', label: 'PH', placeholder: 'e.g. 8.1-8.4' },
  { key: 'salinity', label: 'Salinity', placeholder: 'e.g. 1.023-1.025 sg' },
];

export const EMPTY_PADS: SpeciesPads = {
  care_level: '',
  reef_safe: '',
  min_tank_size: '',
  max_size: '',
  diet: '',
  temperament: '',
  range: '',
  flow: [],
  placement: [],
  lighting: [],
  calcium: '',
  magnesium: '',
  alkalinity: '',
  nitrates: '',
  phosphates: '',
  temperature: '',
  ph: '',
  salinity: '',
};

function stringArrayFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  );
}

export function padsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): SpeciesPads {
  const raw = (metadata?.pads ?? {}) as Record<string, unknown>;
  return {
    care_level: typeof raw.care_level === 'string' ? raw.care_level : '',
    reef_safe: typeof raw.reef_safe === 'string' ? raw.reef_safe : '',
    min_tank_size:
      typeof raw.min_tank_size === 'string' ? raw.min_tank_size : '',
    max_size: typeof raw.max_size === 'string' ? raw.max_size : '',
    diet: typeof raw.diet === 'string' ? raw.diet : '',
    temperament: typeof raw.temperament === 'string' ? raw.temperament : '',
    range: typeof raw.range === 'string' ? raw.range : '',
    flow: stringArrayFrom(raw.flow),
    placement: stringArrayFrom(raw.placement),
    lighting: stringArrayFrom(raw.lighting),
    calcium: typeof raw.calcium === 'string' ? raw.calcium : '',
    magnesium: typeof raw.magnesium === 'string' ? raw.magnesium : '',
    alkalinity: typeof raw.alkalinity === 'string' ? raw.alkalinity : '',
    nitrates: typeof raw.nitrates === 'string' ? raw.nitrates : '',
    phosphates: typeof raw.phosphates === 'string' ? raw.phosphates : '',
    temperature: typeof raw.temperature === 'string' ? raw.temperature : '',
    ph: typeof raw.ph === 'string' ? raw.ph : '',
    salinity: typeof raw.salinity === 'string' ? raw.salinity : '',
  };
}

export function cleanedPads(
  pads: SpeciesPads,
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  (Object.keys(pads) as (keyof SpeciesPads)[]).forEach((k) => {
    const v = pads[k];
    if (Array.isArray(v)) {
      if (v.length) out[k] = v;
    } else {
      const trimmed = v.trim();
      if (trimmed) out[k] = trimmed;
    }
  });
  return out;
}

export async function listOrganizeOptions(): Promise<OrganizeOptions> {
  const [tagsRes, typesRes, collectionsRes, categoriesRes] = await Promise.all([
    sdk.admin.productTag.list({ limit: 200 } as any).catch(() => ({ product_tags: [] })),
    sdk.admin.productType.list({ limit: 200 } as any).catch(() => ({ product_types: [] })),
    sdk.admin.productCollection.list({ limit: 200 } as any).catch(() => ({ collections: [] })),
    sdk.admin.productCategory
      .list({ limit: 200, fields: 'id,name,handle' } as any)
      .catch(() => ({ product_categories: [] })),
  ]);
  const categoryRows: any[] = (categoriesRes as any).product_categories || [];
  const categoriesByHandle: Record<string, OrganizeOption & { handle: string }> = {};
  for (const c of categoryRows) {
    if (c.handle) {
      categoriesByHandle[c.handle] = { id: c.id, label: c.name, handle: c.handle };
    }
  }
  return {
    tags: ((tagsRes as any).product_tags || []).map((t: any) => ({ id: t.id, label: t.value })),
    types: ((typesRes as any).product_types || []).map((t: any) => ({ id: t.id, label: t.value })),
    collections: ((collectionsRes as any).collections || []).map((c: any) => ({ id: c.id, label: c.title })),
    categories: categoryRows.map((c: any) => ({ id: c.id, label: c.name })),
    categoriesByHandle,
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
  typeKey?: ProductTypeKey | null;
  newArrival?: boolean;
  pads?: SpeciesPads;
  organizeOptions?: OrganizeOptions | null;
};

function resolveTypeCategoryIds(
  opts: OrganizeOptions | null | undefined,
  typeKey: ProductTypeKey | null | undefined,
  newArrival: boolean | undefined,
): string[] {
  if (!opts) return [];
  const ids: string[] = [];
  if (typeKey) {
    const match = opts.categoriesByHandle[typeKey];
    if (match) ids.push(match.id);
  }
  if (newArrival) {
    const na = opts.categoriesByHandle[NEW_ARRIVALS_HANDLE];
    if (na) ids.push(na.id);
  }
  return ids;
}

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

  const typeCatIds = resolveTypeCategoryIds(
    input.organizeOptions,
    input.typeKey ?? null,
    input.newArrival,
  );
  const mergedCategoryIds = Array.from(
    new Set([...(input.organize?.categoryIds ?? []), ...typeCatIds]),
  );

  if (input.organize) {
    if (input.organize.tagIds.length) {
      payload.tags = input.organize.tagIds.map((id) => ({ id }));
    }
    if (input.organize.typeId) payload.type_id = input.organize.typeId;
    if (input.organize.collectionId) payload.collection_id = input.organize.collectionId;
  }
  if (mergedCategoryIds.length) {
    payload.categories = mergedCategoryIds.map((id) => ({ id }));
  }
  if (input.pads) {
    const cleaned = cleanedPads(input.pads);
    if (Object.keys(cleaned).length) {
      payload.metadata = { pads: cleaned };
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

export function deriveTypeKeyFromCategories(
  categories: Array<{ handle?: string | null }> | null | undefined,
): ProductTypeKey | null {
  if (!categories?.length) return null;
  for (const c of categories) {
    const h = c?.handle;
    if (!h) continue;
    const match = PRODUCT_TYPE_OPTIONS.find((o) => o.handle === h);
    if (match) return match.key;
  }
  return null;
}

export function hasNewArrivalCategory(
  categories: Array<{ handle?: string | null }> | null | undefined,
): boolean {
  if (!categories?.length) return false;
  return categories.some((c) => c?.handle === NEW_ARRIVALS_HANDLE);
}

export type CategorizationInput = {
  productId: string;
  currentCategoryIds: string[];
  currentCategoryHandles: Array<string | null | undefined>;
  currentMetadata: Record<string, unknown> | null | undefined;
  typeKey: ProductTypeKey | null;
  newArrival: boolean;
  pads?: SpeciesPads;
  organizeOptions: OrganizeOptions | null;
};

// Replaces the product's type category + new-arrival membership without
// disturbing unrelated categories the admin may have set in Medusa directly.
export async function updateProductCategorization(
  input: CategorizationInput,
): Promise<void> {
  const opts = input.organizeOptions;
  if (!opts) return;

  const managedHandles = [
    ...PRODUCT_TYPE_OPTIONS.map((o) => o.handle),
    NEW_ARRIVALS_HANDLE,
  ];

  // Drop any managed category the admin previously had assigned — we rebuild.
  const preservedIds: string[] = [];
  input.currentCategoryIds.forEach((id, idx) => {
    const handle = input.currentCategoryHandles[idx];
    if (!handle || !managedHandles.includes(handle)) {
      preservedIds.push(id);
    }
  });

  const nextManagedIds = resolveTypeCategoryIds(
    opts,
    input.typeKey,
    input.newArrival,
  );
  const nextCategoryIds = Array.from(
    new Set([...preservedIds, ...nextManagedIds]),
  );

  const payload: any = {
    categories: nextCategoryIds.map((id) => ({ id })),
  };

  if (input.pads) {
    const cleaned = cleanedPads(input.pads);
    const currentMetadata = { ...(input.currentMetadata || {}) };
    if (Object.keys(cleaned).length) {
      payload.metadata = { ...currentMetadata, pads: cleaned };
    } else if ('pads' in currentMetadata) {
      const { pads: _drop, ...rest } = currentMetadata;
      payload.metadata = rest;
    }
  }

  await sdk.admin.product.update(input.productId, payload);
}

export type DeleteRequest = {
  productId: string;
  title: string;
  thumbnail: string | null;
  requestedByEmail: string;
  requestedByName: string | null;
  requestedAt: string;
};

type Requester = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
};

function readDeleteRequest(p: any): DeleteRequest | null {
  const dr = p?.metadata?.delete_request;
  if (!dr || typeof dr !== 'object') return null;
  if (!dr.requested_by_email || !dr.requested_at) return null;
  return {
    productId: p.id,
    title: p.title,
    thumbnail: p.thumbnail || null,
    requestedByEmail: String(dr.requested_by_email),
    requestedByName: dr.requested_by_name ? String(dr.requested_by_name) : null,
    requestedAt: String(dr.requested_at),
  };
}

export async function requestDeleteProduct(
  productId: string,
  requester: Requester,
): Promise<void> {
  const { product } = await sdk.admin.product.retrieve(productId, {
    fields: 'id,metadata',
  } as any);
  const current = (product as any).metadata || {};
  const name =
    [requester.first_name, requester.last_name].filter(Boolean).join(' ') ||
    null;
  await sdk.admin.product.update(productId, {
    metadata: {
      ...current,
      delete_request: {
        requested_by_id: requester.id,
        requested_by_email: requester.email,
        requested_by_name: name,
        requested_at: new Date().toISOString(),
      },
    },
  } as any);
}

export async function rejectDeleteProduct(productId: string): Promise<void> {
  const { product } = await sdk.admin.product.retrieve(productId, {
    fields: 'id,metadata',
  } as any);
  const current = { ...((product as any).metadata || {}) };
  delete current.delete_request;
  await sdk.admin.product.update(productId, {
    metadata: current,
  } as any);
}

export async function approveDeleteProduct(productId: string): Promise<void> {
  await sdk.admin.product.delete(productId);
}

export async function listDeleteRequests(): Promise<DeleteRequest[]> {
  const fields = 'id,title,thumbnail,metadata';
  const pageSize = 200;
  const results: DeleteRequest[] = [];
  let offset = 0;
  while (true) {
    const res = (await sdk.admin.product.list({
      limit: pageSize,
      offset,
      fields,
    } as any)) as any;
    const batch: any[] = res.products || [];
    for (const p of batch) {
      const dr = readDeleteRequest(p);
      if (dr) results.push(dr);
    }
    const total = typeof res.count === 'number' ? res.count : offset + batch.length;
    offset += batch.length;
    if (batch.length === 0 || offset >= total) break;
  }
  results.sort(
    (a, b) =>
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
  );
  return results;
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
