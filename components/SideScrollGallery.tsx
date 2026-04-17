"use client";

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
    <div className="flex-shrink-0 w-44 sm:w-56 md:w-64 group cursor-pointer">
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
            <span className="absolute top-3 left-3 text-[10px] font-medium tracking-widest uppercase bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded z-10">
              {item.tag}
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <p className="text-white font-medium text-sm leading-snug">
              {item.name}
            </p>
            <p className="text-white text-sm font-semibold mt-1">
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
}: SideScrollGalleryProps) {
  const doubled = [...items, ...items];

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

      <div className="gallery-auto-scroll flex gap-4 px-6">
        {doubled.map((item, i) => (
          <PlaceholderCard key={`${item.id}-${i}`} item={item} />
        ))}
      </div>
    </section>
  );
}
