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

type StoreProduct = {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  variants: Variant[];
};

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
          fields: "id,handle,title,description,thumbnail,*variants.calculated_price",
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

  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <nav className="text-xs text-slate-500 mb-8 flex items-center gap-2">
            <a href="/store" className="hover:text-slate-300 transition-colors">
              Store
            </a>
            <span>/</span>
            <span className="text-slate-300">
              {product?.title ?? (loading ? "Loading…" : "Not found")}
            </span>
          </nav>

          {loading ? (
            <div className="text-center py-32">
              <p className="text-slate-400 text-sm">Loading product…</p>
            </div>
          ) : error || !product ? (
            <div className="text-center py-32">
              <p className="text-red-400 text-sm mb-2">Could not load product.</p>
              {error && <p className="text-slate-500 text-xs">{error}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="w-full aspect-square rounded-xl border border-white/10 overflow-hidden relative bg-ocean-800">
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
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
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
                      thumbnail: product.thumbnail,
                      price: Math.round(price.calculated_amount * 100),
                      variants: [
                        {
                          id: variant.id,
                          title: variant.title,
                          price: Math.round(price.calculated_amount * 100),
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
