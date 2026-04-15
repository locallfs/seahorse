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

export default function ProductGrid({ category }: { category: string }) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    medusa.store.product
      .list({ fields: "id,handle,title,thumbnail,*variants.calculated_price" })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.products as StoreProduct[]);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? "Failed to load products");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="text-center py-32">
        <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-4">
          <div className="w-2 h-2 rounded-full bg-blue-accent animate-pulse" />
        </div>
        <p className="text-slate-400 text-sm">Loading products…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-32">
        <p className="text-red-400 text-sm mb-2">Could not load products.</p>
        <p className="text-slate-500 text-xs">{error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-32">
        <p className="text-slate-400">No products found{category !== "all" ? " in this category" : ""}.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => {
        const price = product.variants?.[0]?.calculated_price;
        return (
          <Link key={product.id} href={`/products/${product.handle}`} className="group">
            <div className="rounded-lg border border-white/10 group-hover:border-white/30 overflow-hidden transition-all duration-300">
              <div className="w-full aspect-square relative bg-ocean-800">
                {product.thumbnail ? (
                  <Image
                    src={product.thumbnail}
                    alt={product.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                    No image
                  </div>
                )}
              </div>
              <div className="p-3 bg-ocean-900">
                <p className="text-sm text-white font-medium leading-snug mb-1 group-hover:text-blue-light transition-colors">
                  {product.title}
                </p>
                {price && (
                  <p className="text-sm text-blue-accent font-semibold">
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
