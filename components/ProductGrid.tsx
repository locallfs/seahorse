"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { medusa } from "@/lib/medusa";

type StoreProduct = {
  id: string;
  handle: string;
  title: string;
  thumbnail: string | null;
  variants: Array<{
    calculated_price?: {
      calculated_amount: number;
      currency_code: string;
    };
  }>;
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

export default function ProductGrid({
  category,
  tagValues,
}: {
  category?: string;
  tagValues?: string[];
}) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tagKey = tagValues?.join("|") ?? "";

  useEffect(() => {
    let cancelled = false;
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    const wanted = new Set((tagValues ?? []).map(normalize));

    (async () => {
      try {
        const regionsRes = await medusa.store.region.list();
        const regionId = regionsRes.regions?.[0]?.id;

        if (tagValues && tagValues.length > 0) {
          const res = await medusa.store.product.list({
            fields: "id,handle,title,thumbnail,tags.value,*variants.calculated_price",
            region_id: regionId,
            limit: 200,
          } as any);
          if (cancelled) return;
          const filtered = (res.products as any[]).filter((p) => {
            const tags: Array<{ value?: string }> = p?.tags || [];
            return tags.some((t) => t?.value && wanted.has(normalize(t.value)));
          });
          const unique = Array.from(new Map(filtered.map((p: any) => [p.id, p])).values());
          setProducts(unique as StoreProduct[]);
          setLoading(false);
          return;
        }

        let categoryId: string | undefined;
        if (category && category !== "all") {
          const catRes = await medusa.store.category.list({ handle: category });
          categoryId = (catRes as any).product_categories?.[0]?.id;
        }

        const params: Record<string, any> = {
          fields: "id,handle,title,thumbnail,*variants.calculated_price",
          region_id: regionId,
        };
        if (categoryId) {
          params.category_id = [categoryId];
        }

        const res = await medusa.store.product.list(params);
        if (cancelled) return;
        setProducts(res.products as StoreProduct[]);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error)?.message ?? "Failed to load products");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, tagKey]);

  if (loading) {
    return (
      <div className="text-center py-32">
        <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-4">
          <div className="w-2 h-2 rounded-full bg-blue-accent animate-pulse" />
        </div>
        <p className="text-white text-sm">Loading products…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-32">
        <p className="text-red-400 text-sm mb-2">Could not load products.</p>
        <p className="text-white text-xs">{error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-32">
        <p className="text-white">No products found{category !== "all" ? " in this category" : ""}.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => {
        const price = product.variants?.[0]?.calculated_price;
        return (
          <Link key={product.id} href={`/products/${product.handle}`} className="group">
            <div className="rounded-lg border border-white/10 group-hover:border-white/30 overflow-hidden transition-all duration-300 glow-purple">
              <div className="w-full aspect-square relative bg-ocean-800">
                {product.thumbnail ? (
                  <Image
                    src={product.thumbnail}
                    alt={product.title}
                    fill
                    className="object-contain group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-xs">
                    No image
                  </div>
                )}
              </div>
              <div className="p-3 bg-ocean-900">
                <p className="text-sm text-white font-medium leading-snug mb-1">
                  {product.title}
                </p>
                {price && (
                  <p className="text-sm text-white font-semibold">
                    {formatPrice(price.calculated_amount, price.currency_code)}
                  </p>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
