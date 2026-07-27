"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { medusa } from "@/lib/medusa";
import { storeFetch } from "@/lib/storeFetch";
import { sortProductsAlpha } from "@/lib/alphaSort";
import { allVariantsUnavailable, getStartingPrice } from "@/lib/sizes";
import { isFreeShippingEligible } from "@/lib/freeShipping";
import ProductBadges from "./ProductBadges";

type StoreProduct = {
  id: string;
  handle: string;
  title: string;
  thumbnail: string | null;
  metadata?: Record<string, unknown> | null;
  categories?: Array<{ handle?: string | null }> | null;
  tags?: Array<{ value?: string | null }> | null;
  variants: Array<{
    title?: string | null;
    metadata?: Record<string, unknown> | null;
    calculated_price?: {
      calculated_amount: number;
      currency_code: string;
    };
    manage_inventory?: boolean | null;
    inventory_quantity?: number | null;
    allow_backorder?: boolean | null;
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

    (async () => {
      try {
        const regionsRes = await medusa.store.region.list();
        const regionId = regionsRes.regions?.[0]?.id;

        if (tagValues && tagValues.length > 0) {
          const wanted = new Set(tagValues.map(normalize));
          const tagRes = await storeFetch<{
            product_tags?: Array<{ id: string; value: string }>;
          }>("/store/product-tags").catch(() => ({
            product_tags: [] as Array<{ id: string; value: string }>,
          }));
          const tagIds = (tagRes.product_tags ?? [])
            .filter((t) => wanted.has(normalize(t.value)))
            .map((t) => t.id);

          if (tagIds.length === 0) {
            if (!cancelled) {
              setProducts([]);
              setLoading(false);
            }
            return;
          }

          const pageSize = 200;
          const collected: any[] = [];
          let offset = 0;
          while (!cancelled) {
            const res = await medusa.store.product.list({
              fields:
                "id,handle,title,thumbnail,metadata,tags.value,*categories,*variants,*variants.calculated_price,variants.metadata,variants.manage_inventory,variants.inventory_quantity,variants.allow_backorder",
              region_id: regionId,
              tag_id: tagIds,
              limit: pageSize,
              offset,
            } as any);
            const page = (res.products as any[]) || [];
            collected.push(...page);
            const total =
              typeof (res as any).count === "number"
                ? (res as any).count
                : collected.length;
            offset += page.length;
            if (page.length === 0 || offset >= total) break;
            if (offset > 10000) break;
          }
          if (cancelled) return;
          const unique = Array.from(
            new Map(collected.map((p: any) => [p.id, p])).values(),
          );
          // Browse pages are always alphabetical (A–Z, natural, case-insensitive).
          setProducts(sortProductsAlpha(unique as StoreProduct[]));
          setLoading(false);
          return;
        }

        let categoryId: string | undefined;
        if (category && category !== "all") {
          const catRes = await medusa.store.category.list({ handle: category });
          categoryId = (catRes as any).product_categories?.[0]?.id;
        }

        const pageSize = 200;
        const collected: any[] = [];
        let offset = 0;
        while (!cancelled) {
          const params: Record<string, any> = {
            fields:
              "id,handle,title,thumbnail,metadata,tags.value,*categories,*variants,*variants.calculated_price,variants.metadata,variants.manage_inventory,variants.inventory_quantity,variants.allow_backorder",
            region_id: regionId,
            limit: pageSize,
            offset,
          };
          if (categoryId) params.category_id = [categoryId];
          const res = await medusa.store.product.list(params);
          const page = (res.products as any[]) || [];
          collected.push(...page);
          const total =
            typeof (res as any).count === "number"
              ? (res as any).count
              : collected.length;
          offset += page.length;
          if (page.length === 0 || offset >= total) break;
          if (offset > 10000) break;
        }
        if (cancelled) return;
        // Browse pages are always alphabetical (A–Z, natural, case-insensitive).
        setProducts(sortProductsAlpha(collected as StoreProduct[]));
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
        const price = getStartingPrice(product.variants);
        const outOfStock = allVariantsUnavailable(product.variants);
        return (
          <Link key={product.id} href={`/products/${product.handle}`} className="group">
            <div className="rounded-lg border border-white/10 group-hover:border-white/30 overflow-hidden transition-all duration-300 glow-purple">
              <div className="w-full aspect-square relative bg-black">
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
                <ProductBadges
                  outOfStock={outOfStock}
                  priceAmount={price?.amount}
                  freeShippingEligible={isFreeShippingEligible(product)}
                />
              </div>
              <div className="p-3 bg-ocean-900">
                <p className="text-sm text-white font-medium leading-snug mb-1">
                  {product.title}
                </p>
                {price && (
                  <p className="text-sm text-white font-semibold">
                    {price.isFrom ? "From " : ""}
                    {formatPrice(price.amount, price.currency)}
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
