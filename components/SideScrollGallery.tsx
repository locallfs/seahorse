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

interface SideScrollGalleryProps {
  title: string;
  subtitle?: string;
  categoryHandle: string;
  viewAllHref: string;
  tag?: string;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

function ProductCard({ product, tag }: { product: StoreProduct; tag?: string }) {
  const price = product.variants?.[0]?.calculated_price;
  return (
    <Link
      href={`/products/${product.handle}`}
      className="flex-shrink-0 w-44 sm:w-56 md:w-64 group"
    >
      <div className="relative overflow-hidden rounded-lg border border-white/10 group-hover:border-white/25 transition-all duration-300 glow-purple">
        <div className="w-full aspect-[3/4] relative bg-ocean-800">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 224px, 256px"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white text-xs">
              No image
            </div>
          )}
          {tag && (
            <span className="absolute top-3 left-3 text-[10px] font-medium tracking-widest uppercase bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded z-10">
              {tag}
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <p className="text-white font-medium text-sm leading-snug line-clamp-2">
              {product.title}
            </p>
            {price && (
              <p className="text-white text-sm font-semibold mt-1">
                {formatPrice(price.calculated_amount, price.currency_code)}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function SideScrollGallery({
  title,
  subtitle,
  categoryHandle,
  viewAllHref,
  tag,
}: SideScrollGalleryProps) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const regionsRes = await medusa.store.region.list();
        const regionId = regionsRes.regions?.[0]?.id;

        const catRes = await medusa.store.category.list({ handle: categoryHandle });
        const categoryId = (catRes as any).product_categories?.[0]?.id;

        if (!categoryId) {
          if (!cancelled) setLoading(false);
          return;
        }

        const res = await medusa.store.product.list({
          fields: "id,handle,title,thumbnail,*variants.calculated_price",
          region_id: regionId,
          category_id: [categoryId],
          limit: 12,
        } as any);

        if (cancelled) return;
        setProducts(res.products as StoreProduct[]);
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryHandle]);

  if (!loading && products.length === 0) {
    return null;
  }

  const displayItems = products.length > 0 ? [...products, ...products] : [];

  return (
    <section className="py-20 overflow-hidden">
      <div className="max-w-screen-xl mx-auto px-6">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase font-medium mb-2 text-[#FFD700]">
              {subtitle || "Browse Collection"}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              {title}
            </h2>
          </div>
          <Link
            href={viewAllHref}
            className="text-sm text-white hover:text-white transition-colors duration-200 flex items-center gap-1.5"
          >
            View All
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M2 6h8M7 3l3 3-3 3" />
            </svg>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-4 px-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-44 sm:w-56 md:w-64 aspect-[3/4] rounded-lg bg-ocean-800/60 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="gallery-auto-scroll flex gap-4 px-6">
          {displayItems.map((product, i) => (
            <ProductCard key={`${product.id}-${i}`} product={product} tag={tag} />
          ))}
        </div>
      )}
    </section>
  );
}
