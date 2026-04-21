"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AuctionCountdown from "./AuctionCountdown";
import {
  listAuctions,
  formatCents,
  type AuctionListItem,
} from "@/lib/auctions";

export default function HomeLiveAuctions() {
  const [auctions, setAuctions] = useState<AuctionListItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      listAuctions()
        .then((r) => {
          if (cancelled) return;
          setAuctions(r.auctions.filter((a) => a.status === "live"));
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoaded(true);
        });
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!loaded || auctions.length === 0) return null;

  return (
    <section className="py-12 border-t border-white/10">
      <div className="max-w-screen-xl mx-auto px-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-1">
              Live right now
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Auctions
            </h2>
          </div>
          <Link
            href="/auctions"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.slice(0, 3).map((a) => {
            const thumb =
              a.product?.images[0]?.url || a.product?.thumbnail || null;
            const current =
              a.current_high_bid_amount ?? a.starting_bid ?? 0;
            return (
              <Link
                key={a.id}
                href={`/auctions/${a.id}`}
                className="group block rounded-xl border border-white/10 hover:border-white/25 overflow-hidden transition-colors bg-ocean-900"
              >
                <div className="aspect-square relative bg-black">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={a.product?.title ?? ""}
                      fill
                      className="object-contain group-hover:scale-[1.02] transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
                      No image
                    </div>
                  )}
                  <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase bg-red-500/90 text-white rounded">
                    Live
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-white font-semibold text-lg leading-snug line-clamp-1">
                    {a.product?.title ?? "Auction"}
                  </h3>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-white/50 text-xs tracking-wider uppercase">
                        {a.current_high_bid_amount != null
                          ? "Current bid"
                          : "Starting bid"}
                      </p>
                      <p className="text-white text-xl font-bold">
                        {formatCents(current)}
                      </p>
                    </div>
                    <AuctionCountdown
                      startsAt={a.starts_at}
                      endsAt={a.ends_at}
                      status={a.status}
                      compact
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
