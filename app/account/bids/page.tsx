"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuctionCountdown from "@/components/AuctionCountdown";
import { useAuth } from "@/components/AuthContext";
import {
  listMyBids,
  formatCents,
  type MyBidAuction,
} from "@/lib/auctions";

function statusPill(a: MyBidAuction) {
  if (a.is_winner && a.winner_offer_status === "pending_payment") {
    return { label: "Won — pay now", color: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" };
  }
  if (a.is_winner && a.winner_offer_status === "paid") {
    return { label: "Won — paid", color: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" };
  }
  if (a.is_winner && a.winner_offer_status === "forfeited") {
    return { label: "Forfeited", color: "bg-red-500/20 text-red-200 border-red-500/40" };
  }
  if (a.status === "live" && a.is_current_high) {
    return { label: "Winning", color: "bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/40" };
  }
  if (a.status === "live") {
    return { label: "Outbid", color: "bg-white/10 text-white/70 border-white/20" };
  }
  if (a.status === "ended") {
    return { label: "Ended", color: "bg-white/10 text-white/70 border-white/20" };
  }
  if (a.status === "cancelled") {
    return { label: "Cancelled", color: "bg-white/10 text-white/70 border-white/20" };
  }
  return { label: a.status, color: "bg-white/10 text-white/70 border-white/20" };
}

export default function AccountBidsPage() {
  const router = useRouter();
  const { customer, loading: authLoading } = useAuth();
  const [auctions, setAuctions] = useState<MyBidAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { auctions } = await listMyBids();
      setAuctions(auctions);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load bids");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!customer) {
      router.replace("/login?redirect=/account/bids");
      return;
    }
    load();
  }, [authLoading, customer, router, load]);

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <main className="pt-24 min-h-screen" />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="max-w-screen-lg mx-auto px-6 py-10">
          <Link
            href="/account"
            className="text-xs tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors"
          >
            ← My account
          </Link>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-sm tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-1">
                Your bids
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Auction activity
              </h1>
            </div>
            <Link
              href="/auctions"
              className="text-sm text-white/80 hover:text-white transition-colors"
            >
              Browse auctions →
            </Link>
          </div>

          {error && (
            <div className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 text-red-200 text-sm px-4 py-3">
              {error}
            </div>
          )}

          {auctions.length === 0 ? (
            <div className="mt-8 rounded-lg border border-white/10 bg-ocean-900/40 text-center py-16 px-6">
              <p className="text-white text-lg">
                You haven&apos;t placed any bids yet.
              </p>
              <Link
                href="/auctions"
                className="inline-block mt-4 text-sm text-[#FFD700] hover:underline"
              >
                See what&apos;s live
              </Link>
            </div>
          ) : (
            <ul className="mt-6 flex flex-col gap-4">
              {auctions.map((a) => {
                const pill = statusPill(a);
                const needsPay =
                  a.is_winner && a.winner_offer_status === "pending_payment";
                return (
                  <li
                    key={a.id}
                    className="rounded-xl border border-white/10 bg-ocean-900 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_auto] gap-4 p-4 items-center">
                      <div className="relative aspect-square w-[120px] rounded-md border border-white/10 bg-black overflow-hidden">
                        {a.product?.thumbnail ? (
                          <Image
                            src={a.product.thumbnail}
                            alt={a.product.title}
                            fill
                            className="object-contain"
                            sizes="120px"
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-white font-semibold text-lg leading-tight">
                            {a.product?.title ?? "Auction"}
                          </h3>
                          <span
                            className={`text-[10px] tracking-widest uppercase font-semibold px-2 py-0.5 rounded border ${pill.color}`}
                          >
                            {pill.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                          <div>
                            <span className="text-white/50 text-xs mr-1">
                              Your top bid:
                            </span>
                            <span className="text-white tabular-nums font-medium">
                              {formatCents(a.my_highest_bid?.amount)}
                            </span>
                          </div>
                          <div>
                            <span className="text-white/50 text-xs mr-1">
                              Current high:
                            </span>
                            <span className="text-white tabular-nums font-medium">
                              {formatCents(a.current_high_bid_amount)}
                            </span>
                          </div>
                          <div>
                            <span className="text-white/50 text-xs mr-1">
                              Bids placed:
                            </span>
                            <span className="text-white tabular-nums font-medium">
                              {a.my_bid_count}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {a.status === "live" && (
                          <AuctionCountdown
                            startsAt={a.starts_at}
                            endsAt={a.ends_at}
                            status={a.status}
                            compact
                          />
                        )}
                        {needsPay ? (
                          <Link
                            href={`/auctions/${a.id}/pay`}
                            className="px-4 py-2 text-sm font-medium bg-blue-accent hover:bg-blue-light text-white rounded transition-colors"
                          >
                            Pay now
                          </Link>
                        ) : (
                          <Link
                            href={`/auctions/${a.id}`}
                            className="px-4 py-2 text-sm font-medium border border-white/20 hover:border-white/40 text-white/90 rounded transition-colors"
                          >
                            View
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
