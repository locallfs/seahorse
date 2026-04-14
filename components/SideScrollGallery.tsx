"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";

export interface GalleryItem {
  id: number;
  name: string;
  price: string;
  gradient: string;
  tag?: string;
  img?: string;
  handle?: string;
}

interface SideScrollGalleryProps {
  title: string;
  subtitle?: string;
  items: GalleryItem[];
  viewAllHref: string;
  accentColor?: string;
}

function PlaceholderCard({ item }: { item: GalleryItem }) {
  return (
    <div className="flex-shrink-0 w-56 md:w-64 group cursor-pointer">
      <div className="relative overflow-hidden rounded-lg border border-white/10 group-hover:border-white/25 transition-all duration-300">
        <div className="w-full aspect-[3/4] relative bg-ocean-800">
          {item.img ? (
            <Image
              src={item.img}
              alt={item.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 224px, 256px"
            />
          ) : (
            <div className="absolute inset-0" style={{ background: item.gradient }} />
          )}
          {item.tag && (
            <span className="absolute top-3 left-3 text-[10px] font-medium tracking-widest uppercase bg-blue-accent/90 text-white px-2 py-1 rounded z-10">
              {item.tag}
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <p className="text-white font-medium text-sm leading-snug">
              {item.name}
            </p>
            <p className="text-blue-light text-sm font-semibold mt-1">
              {item.price}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SideScrollGallery({
  title,
  subtitle,
  items,
  viewAllHref,
  accentColor = "#0ea5e9",
}: SideScrollGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-20 overflow-hidden">
      <div className="max-w-screen-xl mx-auto px-6">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p
              className="text-xs tracking-[0.25em] uppercase font-medium mb-2"
              style={{ color: accentColor }}
            >
              {subtitle || "Browse Collection"}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => scroll("left")}
              className="w-9 h-9 rounded-full border border-white/15 hover:border-white/40 flex items-center justify-center text-slate-400 hover:text-white transition-all duration-200"
              aria-label="Scroll left"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M8.5 2L4 7l4.5 5" />
              </svg>
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-9 h-9 rounded-full border border-white/15 hover:border-white/40 flex items-center justify-center text-slate-400 hover:text-white transition-all duration-200"
              aria-label="Scroll right"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M5.5 2L10 7l-4.5 5" />
              </svg>
            </button>
            <Link
              href={viewAllHref}
              className="text-sm text-slate-400 hover:text-white transition-colors duration-200 flex items-center gap-1.5 ml-2"
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
      </div>

      <div
        ref={scrollRef}
        className="gallery-scroll flex gap-4 overflow-x-auto px-6 pb-2"
        style={{ paddingLeft: "max(1.5rem, calc((100vw - 1280px) / 2 + 1.5rem))" }}
      >
        {items.map((item) => (
          <PlaceholderCard key={item.id} item={item} />
        ))}
        <Link
          href={viewAllHref}
          className="flex-shrink-0 w-56 md:w-64 rounded-lg border border-white/10 hover:border-white/25 flex items-center justify-center transition-all duration-300 aspect-[3/4] bg-ocean-900/50 group"
        >
          <div className="text-center">
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center mx-auto mb-3 group-hover:border-white/40 transition-colors">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-slate-400 group-hover:text-white transition-colors"
              >
                <path d="M3 8h10M10 5l3 3-3 3" />
              </svg>
            </div>
            <p className="text-sm text-slate-400 group-hover:text-white transition-colors">
              View All
            </p>
          </div>
        </Link>
      </div>
    </section>
  );
}
