"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { medusa } from "@/lib/medusa";
import FreeShippingBadge from "./FreeShippingBadge";

type StoreProduct = {
  id: string;
  handle: string;
  title: string;
  thumbnail: string | null;
  images?: Array<{ id?: string; url: string; rank?: number }> | null;
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
  tagValues: string[];
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

  const images = useMemo(() => {
    const imgs = (product.images || [])
      .slice()
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
      .map((i) => i.url)
      .filter(Boolean);
    if (imgs.length === 0 && product.thumbnail) return [product.thumbnail];
    return Array.from(new Set(imgs));
  }, [product.images, product.thumbnail]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 5000);
    return () => clearInterval(id);
  }, [images.length]);

  return (
    <Link
      href={`/products/${product.handle}`}
      className="flex-shrink-0 w-44 sm:w-56 md:w-64 group"
    >
      <div className="relative overflow-hidden rounded-lg border border-white/10 group-hover:border-white/25 transition-all duration-300 glow-purple">
        <div className="w-full aspect-[3/4] relative bg-black overflow-hidden">
          {images.length > 0 ? (
            images.map((src, i) => {
              const active = i === index;
              return (
                <Image
                  key={src}
                  src={src}
                  alt={product.title}
                  fill
                  className={`object-contain transition-all duration-[1100ms] ease-in-out group-hover:scale-105 ${
                    active
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 translate-x-3"
                  }`}
                  sizes="(max-width: 768px) 224px, 256px"
                  unoptimized
                  priority={i === 0}
                />
              );
            })
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
          <FreeShippingBadge amount={price?.calculated_amount} />
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
  tagValues,
  viewAllHref,
  tag,
}: SideScrollGalleryProps) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const tagKey = tagValues.join("|");

  useEffect(() => {
    let cancelled = false;
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    const wanted = new Set(tagValues.map(normalize));

    (async () => {
      try {
        const regionsRes = await medusa.store.region.list();
        const regionId = regionsRes.regions?.[0]?.id;

        const res = await medusa.store.product.list({
          fields: "id,handle,title,thumbnail,tags.value,*images,*variants.calculated_price",
          region_id: regionId,
          limit: 200,
        } as any);

        if (cancelled) return;

        const filtered = (res.products as any[]).filter((p) => {
          const tags: Array<{ value?: string }> = p?.tags || [];
          return tags.some((t) => t?.value && wanted.has(normalize(t.value)));
        });

        const unique = Array.from(
          new Map(filtered.map((p: any) => [p.id, p])).values()
        ).slice(0, 12);

        setProducts(unique as StoreProduct[]);
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tagKey]);

  if (!loading && products.length === 0) {
    return null;
  }

  const useMarquee = products.length > 0 && products.length < 5;
  const displayItems = useMarquee ? products : [...products, ...products];
  const marqueeDuration = useMarquee ? `${18 + products.length * 4}s` : undefined;

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
        <div
          className={
            useMarquee
              ? "gallery-marquee-single px-6"
              : "gallery-auto-scroll flex gap-4 px-6"
          }
          style={
            marqueeDuration
              ? ({ ["--marquee-duration" as any]: marqueeDuration } as React.CSSProperties)
              : undefined
          }
        >
          {displayItems.map((product, i) => (
            <ProductCard key={`${product.id}-${i}`} product={product} tag={tag} />
          ))}
        </div>
      )}
    </section>
  );
}
