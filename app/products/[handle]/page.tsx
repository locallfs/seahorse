"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AddToCartButton from "@/components/AddToCartButton";
import { medusa } from "@/lib/medusa";

type Variant = {
  id: string;
  title: string;
  calculated_price?: {
    calculated_amount: number;
    currency_code: string;
  };
};

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
  variants: Variant[];
  metadata?: { pads?: Pads } | null;
};

const LIVE_KEYWORDS = [
  "fish",
  "coral",
  "invert",
  "shrimp",
  "crab",
  "snail",
  "anemone",
  "seahorse",
  "clown",
  "tang",
  "wrasse",
  "goby",
  "angel",
  "urchin",
  "starfish",
];

const isLiveAnimal = (title: string | null | undefined) => {
  if (!title) return false;
  const t = title.toLowerCase();
  return LIVE_KEYWORDS.some((kw) => t.includes(kw));
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const regionsRes = await medusa.store.region.list();
        const regionId = regionsRes.regions?.[0]?.id;
        const res = await medusa.store.product.list({
          handle,
          fields: "id,handle,title,description,thumbnail,metadata,*variants.calculated_price",
          region_id: regionId,
        });
        if (cancelled) return;
        const found = (res.products as StoreProduct[])[0] ?? null;
        setProduct(found);
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

  const variant = product?.variants?.[0];
  const price = variant?.calculated_price;
  const live = isLiveAnimal(product?.title);
  const pads = product?.metadata?.pads ?? {};
  const padEntries = PAD_ORDER.filter(({ key }) => {
    const v = pads[key];
    return typeof v === "string" && v.trim().length > 0;
  });

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
              <div className="w-full aspect-square rounded-xl border border-white/10 overflow-hidden relative bg-ocean-800 glow-white">
                {product.thumbnail ? (
                  <Image
                    src={product.thumbnail}
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
                  <div
                    className="rounded-xl border-2 p-5 mb-6 bg-ocean-900/70"
                    style={{
                      borderColor: "#FFD700",
                      boxShadow:
                        "0 0 22px rgba(255, 255, 255, 0.45), 0 4px 14px rgba(0, 0, 0, 0.3)",
                    }}
                  >
                    <p
                      className="text-base md:text-lg font-bold tracking-wide mb-1"
                      style={{ color: "#FFD700" }}
                    >
                      Live Animal Shipping — Overnight Shipping REQUIRED!
                    </p>
                    <p className="text-white/85 text-sm leading-relaxed">
                      Local Pickup available at checkout if within 100 miles of our Portland store.
                    </p>
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

                {variant && price && (
                  <AddToCartButton
                    product={{
                      id: product.id,
                      title: product.title,
                      variants: [
                        {
                          id: variant.id,
                          title: variant.title,
                        },
                      ],
                    }}
                  />
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
