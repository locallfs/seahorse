"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import AddToCartButton from "@/components/AddToCartButton";
import ShippingNotice from "@/components/ShippingNotice";
import ProductImageZoom from "@/components/ProductImageZoom";
import { isLiveAnimal, isCoral, CORAL_WATER_CONDITIONS } from "@/lib/liveAnimal";
import {
  allVariantsUnavailable,
  getSizeSystem,
  getStartingPrice,
  isVariantUnavailable,
  sortVariantsBySize,
  visibleVariants,
} from "@/lib/sizes";
import { qualifiesForFreeShippingBadge } from "@/lib/freeShipping";
import type { StoreProduct } from "@/lib/products-server";
import OutOfStockBanner from "@/components/OutOfStockBanner";

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

const PAD_ORDER: Array<{ key: keyof Pads; label: string }> = [
  { key: "care_level", label: "Care Level" },
  { key: "reef_safe", label: "Reef Safe" },
  { key: "min_tank_size", label: "Min Tank Size" },
  { key: "max_size", label: "Max Size" },
  { key: "diet", label: "Diet" },
  { key: "temperament", label: "Temperament" },
  { key: "flow", label: "Flow" },
  { key: "placement", label: "Placement" },
  { key: "lighting", label: "Lighting" },
  { key: "range", label: "Range" },
];

function padDisplayValue(raw: unknown): string | null {
  if (Array.isArray(raw)) {
    const items = raw.filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0
    );
    return items.length ? items.join(" • ") : null;
  }
  if (typeof raw === "string" && raw.trim().length > 0) return raw;
  return null;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

export default function ProductDetail({ product }: { product: StoreProduct }) {
  const firstImage: string | null =
    product.images?.[0]?.url ?? product.thumbnail ?? null;

  // Enabled sizes, in size-system order (fish/coral fixed lists, supply staff
  // order). Products without a size system keep their existing variant order.
  const enabledVariants = useMemo(() => {
    const sizeSystem = getSizeSystem(
      product.metadata as Record<string, unknown> | null,
    );
    return sortVariantsBySize(
      visibleVariants(product.variants),
      sizeSystem,
      product.metadata?.size_order,
    );
  }, [product]);

  const hasVariantChoice = enabledVariants.length > 1;

  // Multiple sizes → the customer must pick one before price locks in and
  // Add to Cart activates. Single-size products stay auto-selected.
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    hasVariantChoice ? null : enabledVariants[0]?.id ?? null
  );
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(
    firstImage
  );

  const variant = useMemo(() => {
    return enabledVariants.find((v) => v.id === selectedVariantId) ?? null;
  }, [enabledVariants, selectedVariantId]);

  const price = variant?.calculated_price;
  const startingPrice = getStartingPrice(enabledVariants);
  const onSale =
    !!price &&
    typeof price.original_amount === "number" &&
    price.original_amount > price.calculated_amount;
  const displayedAmount = price?.calculated_amount ?? startingPrice?.amount ?? null;
  const live = isLiveAnimal(product);
  const coral = isCoral(product);
  const selectedOutOfStock = !!variant && isVariantUnavailable(variant);
  // The whole product is Out of Stock only when EVERY enabled size is gone.
  const allOutOfStock = allVariantsUnavailable(product.variants);
  const freeShipping = qualifiesForFreeShippingBadge(product, displayedAmount);
  const pads = (product.metadata?.pads ?? {}) as Record<string, unknown>;
  const padEntries = PAD_ORDER.filter(({ key }) => {
    return padDisplayValue(pads[key]) !== null;
  });

  const gallery: ProductImage[] = useMemo(() => {
    const imgs =
      product.images && product.images.length > 0
        ? [...product.images].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
        : product.thumbnail
          ? [{ id: "thumb", url: product.thumbnail }]
          : [];
    return imgs;
  }, [product]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      <div className="flex flex-col gap-3">
        <div className="relative">
          {selectedImageUrl ? (
            <ProductImageZoom src={selectedImageUrl} alt={product.title} />
          ) : (
            <div className="w-full aspect-square rounded-xl border border-white/10 overflow-hidden relative bg-ocean-800 glow-white flex items-center justify-center text-white text-xs">
              No image
            </div>
          )}
          {allOutOfStock && <OutOfStockBanner />}
        </div>
        {gallery.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {gallery.map((img) => {
              const active = img.url === selectedImageUrl;
              return (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageUrl(img.url)}
                  className={`relative w-20 h-20 rounded-md overflow-hidden border transition-all ${
                    active
                      ? "border-[#FFD700] ring-1 ring-[#FFD700]"
                      : "border-white/15 hover:border-white/40"
                  }`}
                  aria-label="View image"
                >
                  <Image
                    src={img.url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                    unoptimized
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
          {product.title}
        </h1>
        {(price || startingPrice) && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {price ? (
              <p className="text-3xl font-bold text-white">
                {formatPrice(price.calculated_amount, price.currency_code)}
                {onSale && (
                  <span className="ml-3 text-lg font-medium text-white/50 line-through align-middle">
                    {formatPrice(price.original_amount!, price.currency_code)}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-3xl font-bold text-white">
                {startingPrice!.isFrom ? "From " : ""}
                {formatPrice(startingPrice!.amount, startingPrice!.currency)}
              </p>
            )}
            {freeShipping && (
              <span className="px-3 py-1.5 rounded-md bg-[#FFD700] text-black text-xs font-bold tracking-wider uppercase">
                ★ Free Shipping ★
              </span>
            )}
          </div>
        )}

        {live && (
          <div className="mb-6">
            <ShippingNotice hasLive />
          </div>
        )}

        {live && padEntries.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {padEntries.map(({ key, label }) => (
              <div
                key={key}
                className="rounded-lg border border-white/15 bg-ocean-800/60 px-4 py-3"
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/55 mb-1">
                  {label}
                </p>
                <p className="text-sm text-white leading-snug">
                  {padDisplayValue(pads[key])}
                </p>
              </div>
            ))}
          </div>
        )}

        {coral && (
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#FFD700] mb-3">
              Water Conditions
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CORAL_WATER_CONDITIONS.map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-md border border-white/15 bg-ocean-800/60 px-3 py-2"
                >
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/55 mb-0.5">
                    {label}
                  </p>
                  <p className="text-sm text-white leading-snug">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {product.description && (
          <div className="border-t border-white/10 pt-6 mb-6">
            <p className="text-white leading-relaxed text-sm whitespace-pre-line">
              {product.description}
            </p>
          </div>
        )}

        {hasVariantChoice && (
          <div className="mb-5">
            <label
              htmlFor="variant-select"
              className="block text-[11px] tracking-[0.18em] uppercase text-white/60 mb-2"
            >
              {product.options?.[0]?.title ?? "Size"}
            </label>
            <select
              id="variant-select"
              value={selectedVariantId ?? ""}
              onChange={(e) => setSelectedVariantId(e.target.value || null)}
              className="w-full bg-ocean-800 text-white text-sm border border-white/20 rounded px-4 py-3 focus:outline-none focus:border-[#FFD700] transition-colors appearance-none"
            >
              <option value="" className="bg-ocean-800">
                Select a size…
              </option>
              {enabledVariants.map((v) => {
                const unavailable = isVariantUnavailable(v);
                return (
                  <option
                    key={v.id}
                    value={v.id}
                    disabled={unavailable}
                    className="bg-ocean-800"
                  >
                    {v.title}
                    {v.calculated_price
                      ? ` — ${formatPrice(v.calculated_price.calculated_amount, v.calculated_price.currency_code)}`
                      : ""}
                    {unavailable ? " (Out of Stock)" : ""}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {hasVariantChoice && !variant ? (
          <AddToCartButton
            variantId=""
            disabled
            disabledLabel={allOutOfStock ? "Out of Stock" : "Select a Size"}
          />
        ) : variant && price ? (
          <AddToCartButton
            variantId={variant.id}
            disabled={selectedOutOfStock}
            disabledLabel={selectedOutOfStock ? "Out of Stock" : undefined}
          />
        ) : null}
      </div>
    </div>
  );
}
