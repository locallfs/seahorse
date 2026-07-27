"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getAllStoreProducts } from "@/lib/catalog";
import { allVariantsUnavailable, getStartingPrice } from "@/lib/sizes";
import { isFreeShippingEligible } from "@/lib/freeShipping";
import ProductBadges from "./ProductBadges";

type StoreProduct = {
  id: string;
  handle: string;
  title: string;
  thumbnail: string | null;
  metadata?: Record<string, unknown> | null;
  images?: Array<{ id?: string; url: string; rank?: number }> | null;
  categories?: Array<{ id: string; handle: string }> | null;
  tags?: Array<{ value?: string | null }> | null;
  variants: Array<{
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

interface SideScrollGalleryProps {
  title: string;
  subtitle?: string;
  tagValues: string[];
  viewAllHref: string;
  tag?: string;
  perCategoryCaps?: Record<string, number>;
}

// Every gallery scrolls at the same fixed pace: one card-width of travel takes
// SECONDS_PER_CARD seconds. Because the animation duration grows with the number
// of cards, the on-screen speed stays identical no matter how many products a
// gallery holds. Lower = faster, higher = slower.
const SECONDS_PER_CARD = 8;

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

function ProductCard({ product, tag }: { product: StoreProduct; tag?: string }) {
  const price = getStartingPrice(product.variants);
  const outOfStock = allVariantsUnavailable(product.variants);

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
          <ProductBadges
            outOfStock={outOfStock}
            priceAmount={price?.amount}
            freeShippingEligible={isFreeShippingEligible(product)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <p className="text-white font-medium text-sm leading-snug line-clamp-2">
              {product.title}
            </p>
            {price && (
              <p className="text-white text-sm font-semibold mt-1">
                {price.isFrom ? "From " : ""}
                {formatPrice(price.amount, price.currency)}
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
  perCategoryCaps,
}: SideScrollGalleryProps) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const tagKey = tagValues.join("|");
  const capsKey = perCategoryCaps
    ? Object.entries(perCategoryCaps)
        .sort()
        .map(([k, v]) => `${k}:${v}`)
        .join("|")
    : "";

  useEffect(() => {
    let cancelled = false;
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    const wanted = new Set(tagValues.map(normalize));

    (async () => {
      try {
        const collected = await getAllStoreProducts();
        if (cancelled) return;

        const filtered = collected.filter((p) => {
          const tags: Array<{ value?: string }> = p?.tags || [];
          return tags.some((t) => t?.value && wanted.has(normalize(t.value)));
        });

        const deduped = Array.from(
          new Map(filtered.map((p: any) => [p.id, p])).values()
        );

        let finalList: any[];
        if (perCategoryCaps) {
          const counts: Record<string, number> = {};
          finalList = [];
          for (const p of deduped) {
            const cats: Array<{ handle?: string }> = p?.categories || [];
            const matchedHandle = cats
              .map((c) => c?.handle)
              .find((h) => h && perCategoryCaps[h] != null);
            if (!matchedHandle) continue;
            const current = counts[matchedHandle] ?? 0;
            if (current >= perCategoryCaps[matchedHandle]) continue;
            counts[matchedHandle] = current + 1;
            finalList.push(p);
          }
        } else {
          finalList = deduped.slice(0, 100);
        }

        setProducts(finalList as StoreProduct[]);
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tagKey, capsKey]);

  if (!loading && products.length === 0) {
    return null;
  }

  const useMarquee = products.length > 0 && products.length < 5;
  const displayItems = useMarquee ? products : [...products, ...products];
  // Auto-scroll loops one full set of cards (doubled content sliding -50%), so
  // its travel is exactly products.length card-widths.
  const autoScrollDuration = useMarquee
    ? undefined
    : `${products.length * SECONDS_PER_CARD}s`;
  // Marquee slides a single set across the viewport; the extra ~5 card-widths
  // account for the empty viewport it crosses so the per-card pace still matches.
  const marqueeDuration = useMarquee
    ? `${(products.length + 5) * SECONDS_PER_CARD}s`
    : undefined;

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
            {
              ...(marqueeDuration
                ? { ["--marquee-duration" as any]: marqueeDuration }
                : {}),
              ...(autoScrollDuration
                ? { animationDuration: autoScrollDuration }
                : {}),
            } as React.CSSProperties
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
