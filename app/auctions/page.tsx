"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuctionCountdown from "@/components/AuctionCountdown";
import {
  listAuctions,
  formatCents,
  type AuctionListItem,
} from "@/lib/auctions";

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<AuctionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      listAuctions()
        .then((r) => {
          if (!cancelled) setAuctions(r.auctions);
        })
        .catch((e) => {
          if (!cancelled) setError(e?.message || "Failed to load auctions");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const live = auctions.filter((a) => a.status === "live");
  const scheduled = auctions.filter((a) => a.status === "scheduled");

  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-12">
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-2">
              English-Style Bidding
            </p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Live Auctions
            </h1>
            <p className="text-white/80 mt-4 max-w-2xl">
              Bid on one-of-a-kind fish, corals, and inverts. Soft close
              protection — any bid in the last two minutes extends the clock.
              Sign in and save a card to bid.
            </p>
          </div>
        </div>

        <div className="max-w-screen-xl mx-auto px-6 py-12">
          {error && (
            <div className="mb-6 rounded-md border border-red-500/40 bg-red-500/10 text-red-200 text-sm px-4 py-3">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-96 rounded-xl bg-ocean-800/60 animate-pulse"
                />
              ))}
            </div>
          ) : live.length === 0 && scheduled.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-ocean-900/40 text-center py-16 px-6">
              <p className="text-white text-lg">
                No auctions are live right now.
              </p>
              <p className="text-white/60 text-sm mt-2">
                Check back soon — or save a card now so you&apos;re ready to bid.
              </p>
              <Link
                href="/account/payment-methods"
                className="inline-block mt-6 px-5 py-2.5 text-sm font-medium bg-blue-accent hover:bg-blue-light text-white rounded transition-colors"
              >
                Save a card
              </Link>
            </div>
          ) : (
            <>
              {live.length > 0 && (
                <section className="mb-12">
                  <h2 className="text-xs tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-4">
                    Live now
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {live.map((a) => (
                      <AuctionCard key={a.id} auction={a} />
                    ))}
                  </div>
                </section>
              )}
              {scheduled.length > 0 && (
                <section>
                  <h2 className="text-xs tracking-[0.25em] uppercase font-medium text-white/70 mb-4">
                    Starting soon
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scheduled.map((a) => (
                      <AuctionCard key={a.id} auction={a} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function AuctionCard({ auction }: { auction: AuctionListItem }) {
  const thumb = auction.product?.images[0]?.url || auction.product?.thumbnail;
  const current =
    auction.current_high_bid_amount ?? auction.starting_bid;
  return (
    <Link
      href={`/auctions/${auction.id}`}
      className="group block rounded-xl border border-white/10 hover:border-white/25 overflow-hidden transition-colors bg-ocean-900"
    >
      <div className="aspect-square relative bg-black">
        {thumb ? (
          <Image
            src={thumb}
            alt={auction.product?.title ?? ""}
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
        {auction.status === "live" && (
          <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase bg-red-500/90 text-white rounded">
            Live
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-white font-semibold text-lg leading-snug line-clamp-1">
          {auction.product?.title ?? "Auction"}
        </h3>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-white/50 text-xs tracking-wider uppercase">
              {auction.current_high_bid_amount != null
                ? "Current bid"
                : "Starting bid"}
            </p>
            <p className="text-white text-xl font-bold">
              {formatCents(current)}
            </p>
          </div>
          <AuctionCountdown
            endsAt={auction.ends_at}
            startsAt={auction.starts_at}
            status={auction.status}
            compact
          />
        </div>
      </div>
    </Link>
  );
}
