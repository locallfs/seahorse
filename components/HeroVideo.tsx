"use client";

import Image from "next/image";
import Link from "next/link";

export default function HeroVideo() {
  return (
    <section className="relative w-full h-[100dvh] min-h-[600px] flex items-center justify-center">
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <p className="text-shimmer-gold uppercase font-semibold mb-6 text-sm md:text-base tracking-[0.25em] [filter:drop-shadow(0_0_6px_rgba(255,215,0,0.55))]">
          Est. 1996 — Pacific Northwest
        </p>
        <div className="mb-8 flex justify-center">
          <Image
            src="/Logo Full Name Only.svg"
            alt="Woody's Seahorse Aquarium & Supply"
            width={900}
            height={450}
            priority
            unoptimized
            className="w-full max-w-4xl h-auto [filter:drop-shadow(0_0_4px_rgba(255,255,255,0.95))_drop-shadow(0_0_10px_rgba(255,255,255,0.7))]"
          />
        </div>
        <p className="text-white text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed [filter:drop-shadow(0_0_4px_rgba(124,58,237,0.95))_drop-shadow(0_0_10px_rgba(91,33,182,0.7))]">
          Premium live saltwater fish, WYSIWYG corals, invertebrates, and
          professional aquarium services.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/new-arrivals"
            className="px-8 py-4 bg-blue-accent hover:bg-blue-light text-[#FFD700] font-medium rounded transition-colors duration-200 tracking-wide text-sm [filter:drop-shadow(0_0_4px_rgba(124,58,237,0.95))_drop-shadow(0_0_10px_rgba(91,33,182,0.7))]"
          >
            View New Arrivals
          </Link>
          <Link
            href="/store"
            className="px-8 py-4 bg-white/15 hover:bg-white/25 text-[#FFD700] font-medium rounded backdrop-blur-sm border border-white/30 transition-colors duration-200 tracking-wide text-sm [filter:drop-shadow(0_0_4px_rgba(124,58,237,0.95))_drop-shadow(0_0_10px_rgba(91,33,182,0.7))]"
          >
            Shop All Products
          </Link>
        </div>
      </div>

      {/* Scroll cue. Gold on a blue halo (see .scroll-cue-glow) so it reads
          over both bright and dark video frames — at white/60 on a 1px line it
          was effectively invisible, and a gold glow only helped on dark ones. */}
      <div className="scroll-cue-glow absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#FFD700]">
        <span className="heartbeat text-xs font-semibold tracking-widest uppercase">
          Scroll
        </span>
        <div className="heartbeat-y flex flex-col items-center gap-1">
          <div className="w-0.5 h-7 rounded-full bg-[#FFD700]" />
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
    </section>
  );
}
