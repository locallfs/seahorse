"use client";

import Image from "next/image";
import Link from "next/link";

export default function HeroVideo() {
  return (
    <section className="relative w-full h-screen min-h-[600px] flex items-center justify-center">
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <p className="text-white uppercase font-medium mb-6 drop-shadow-lg" style={{ fontSize: "clamp(0.85rem, 1.5vw, 1.1rem)", letterSpacing: "0.25em" }}>
          Est. 1996 — Pacific Northwest
        </p>
        <div className="mb-8 flex justify-center">
          <div className="inline-block rounded-2xl bg-black/65 backdrop-blur-sm px-6 py-4 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
            <Image
              src="/Logo Full Name Only.svg"
              alt="Woody's Seahorse Aquarium & Supply"
              width={900}
              height={450}
              priority
              unoptimized
              className="w-full max-w-4xl h-auto"
            />
          </div>
        </div>
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
