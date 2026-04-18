"use client";

import { use, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AddToCartButton from "@/components/AddToCartButton";
import ShippingNotice from "@/components/ShippingNotice";
import { medusa } from "@/lib/medusa";
import { isLiveAnimal } from "@/lib/liveAnimal";

type Variant = {
  id: string;
  title: string;
  calculated_price?: {
    calculated_amount: number;
    currency_code: string;
  };
  options?: { value: string; option_id?: string | null }[] | null;
};

type ProductImage = { id: string; url: string; rank?: number };

type Pads = {
  care_level?: string;
  reef_safe?: string;
  min_tank_size?: string;
  max_size?: string;
  diet?: string;
  temperament?: string;
  water_conditions?: string;
  range?: string;
};

type StoreProduct = {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  images?: ProductImage[] | null;
  variants: Variant[];
  options?: { id: string; title: string }[] | null;
  metadata?: { pads?: Pads } | null;
};

const PAD_ORDER: Array<{ key: keyof Pads; label: string }> = [
  { key: "care_level", label: "Care Level" },
  { key: "reef_safe", label: "Reef Safe" },
  { key: "min_tank_size", label: "Min Tank Size" },
  { key: "max_size", label: "Max Size" },
  { key: "diet", label: "Diet" },
  { key: "temperament", label: "Temperament" },
  { key: "range", label: "Range" },
  { key: "water_conditions", label: "Water Conditions" },
];

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const regionsRes = await medusa.store.region.list();
        const regionId = regionsRes.regions?.[0]?.id;
        const res = await medusa.store.product.list({
          handle,
          fields:
            "id,handle,title,description,thumbnail,metadata,*images,*options,*variants.calculated_price,*variants.options",
          region_id: regionId,
        });
        if (cancelled) return;
        const found = (res.products as StoreProduct[])[0] ?? null;
        setProduct(found);
        if (found?.variants?.length) {
          setSelectedVariantId(found.variants[0].id);
        }
        const firstImage =
          found?.images?.[0]?.url ?? found?.thumbnail ?? null;
        setSelectedImageUrl(firstImage);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error)?.message ?? "Failed to load product");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  const variant = useMemo(() => {
    if (!product) return null;
    return (
      product.variants.find((v) => v.id === selectedVariantId) ??
      product.variants[0] ??
      null
    );
  }, [product, selectedVariantId]);

  const price = variant?.calculated_price;
  const live = isLiveAnimal(product?.title);
  const pads = product?.metadata?.pads ?? {};
  const padEntries = PAD_ORDER.filter(({ key }) => {
    const v = pads[key];
    return typeof v === "string" && v.trim().length > 0;
  });

  const gallery: ProductImage[] = useMemo(() => {
    if (!product) return [];
    const imgs = product.images && product.images.length > 0
      ? [...product.images].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
      : product.thumbnail
        ? [{ id: "thumb", url: product.thumbnail }]
        : [];
    return imgs;
  }, [product]);

  const hasVariantChoice = (product?.variants?.length ?? 0) > 1;

  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <nav className="text-xs text-white mb-8 flex items-center gap-2">
            <a href="/store" className="hover:text-white transition-colors">
              Store
            </a>
            <span>/</span>
            <span className="text-white">
              {product?.title ?? (loading ? "Loading…" : "Not found")}
            </span>
          </nav>

          {loading ? (
            <div className="text-center py-32">
              <p className="text-white text-sm">Loading product…</p>
            </div>
          ) : error || !product ? (
            <div className="text-center py-32">
              <p className="text-red-400 text-sm mb-2">Could not load product.</p>
              {error && <p className="text-white text-xs">{error}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="flex flex-col gap-3">
                <div className="w-full aspect-square rounded-xl border border-white/10 overflow-hidden relative bg-ocean-800 glow-white">
                  {selectedImageUrl ? (
                    <Image
                      src={selectedImageUrl}
                      alt={product.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-xs">
                      No image
                    </div>
                  )}
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
                {price && (
                  <p className="text-3xl font-bold text-white mb-6">
                    {formatPrice(price.calculated_amount, price.currency_code)}
                  </p>
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
                          {pads[key]}
                        </p>
                      </div>
                    ))}
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
                      onChange={(e) => setSelectedVariantId(e.target.value)}
                      className="w-full bg-ocean-800 text-white text-sm border border-white/20 rounded px-4 py-3 focus:outline-none focus:border-[#FFD700] transition-colors appearance-none"
                    >
                      {product.variants.map((v) => (
                        <option key={v.id} value={v.id} className="bg-ocean-800">
                          {v.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {variant && price && (
                  <AddToCartButton variantId={variant.id} />
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
