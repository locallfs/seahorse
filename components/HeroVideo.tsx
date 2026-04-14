"use client";

import Link from "next/link";

export default function HeroVideo() {
  return (
    <section className="relative w-full h-screen min-h-[600px] flex items-center justify-center">
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <p className="text-white text-xs tracking-[0.3em] uppercase font-medium mb-6 drop-shadow-lg">
          Est. 1996 — Pacific Northwest
        </p>
        <h1 className="font-blackchancery leading-tight mb-6" style={{ fontSize: "clamp(2rem, 6vw, 5.5rem)", color: "#4a90d9", textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>
          Woody&apos;s Seahorse
          <br />
          Aquarium & Supply
        </h1>
        <p className="text-slate-200 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow-lg">
          Premium live saltwater fish, WYSIWYG corals, invertebrates, and
          professional aquarium services.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/new-arrivals"
            className="px-8 py-4 bg-blue-accent hover:bg-blue-light text-white font-medium rounded transition-colors duration-200 tracking-wide text-sm"
          >
            View New Arrivals
          </Link>
          <Link
            href="/store"
            className="px-8 py-4 bg-white/15 hover:bg-white/25 text-white font-medium rounded backdrop-blur-sm border border-white/30 transition-colors duration-200 tracking-wide text-sm"
          >
            Shop All Products
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-white/60 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
