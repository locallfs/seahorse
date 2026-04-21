"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuctionCountdown from "@/components/AuctionCountdown";
import { useAuth } from "@/components/AuthContext";
import {
  getAuction,
  placeBid,
  formatCents,
  type AuctionDetail,
} from "@/lib/auctions";

const POLL_FAST_MS = 3000;
const POLL_SLOW_MS = 10000;
const URGENT_WINDOW_MS = 2 * 60 * 1000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export default function AuctionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (Array.isArray(params?.id) ? params.id[0] : params?.id) as string;
  const { customer, loading: authLoading } = useAuth();
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bidInput, setBidInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [imgIndex, setImgIndex] = useState(0);

  const load = useCallback(async () => {
    try {
      const { auction } = await getAuction(id);
      setAuction(auction);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load auction");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    load();
  }, [id, load]);

  useEffect(() => {
    if (!auction) return;
    const tick = () => {
      const remaining = new Date(auction.ends_at).getTime() - Date.now();
      const delay = remaining < URGENT_WINDOW_MS ? POLL_FAST_MS : POLL_SLOW_MS;
      const timer = setTimeout(async () => {
        await load();
      }, delay);
      return timer;
    };
    const timer = tick();
    return () => clearTimeout(timer);
  }, [auction, load]);

  const images = useMemo(() => {
    if (!auction?.product) return [] as string[];
    const arr = auction.product.images?.map((i) => i.url).filter(Boolean) ?? [];
    if (arr.length === 0 && auction.product.thumbnail) return [auction.product.thumbnail];
    return Array.from(new Set(arr));
  }, [auction]);

  const canBid =
    !!auction &&
    auction.status === "live" &&
    new Date(auction.ends_at).getTime() > Date.now() &&
    !!customer;

  const minNext = auction?.min_next_bid ?? 0;

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auction || !canBid) return;
    const dollars = Number(bidInput);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setSubmitError("Enter a valid bid amount in dollars");
      return;
    }
    const cents = Math.round(dollars * 100);
    if (cents < minNext) {
      setSubmitError(`Minimum bid is ${formatCents(minNext)}`);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await placeBid(auction.id, cents);
      setBidInput("");
      await load();
    } catch (e: any) {
      const msg = e?.message || "Bid failed";
      if (msg.includes("card on file")) {
        setSubmitError("Save a card on file before bidding.");
      } else {
        setSubmitError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="pt-24 min-h-screen" />
        <Footer />
      </>
    );
  }

  if (error || !auction) {
    return (
      <>
        <Header />
        <main className="pt-24 min-h-screen">
          <div className="max-w-screen-md mx-auto px-6 py-16 text-center">
            <p className="text-white text-lg">
              {error || "Auction not found."}
            </p>
            <Link
              href="/auctions"
              className="inline-block mt-6 text-sm text-[#FFD700] hover:underline"
            >
              Back to auctions
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const current =
    auction.current_high_bid?.amount ?? null;

  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="max-w-screen-xl mx-auto px-6 py-10">
          <Link
            href="/auctions"
            className="text-xs tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors"
          >
            ← All auctions
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-6">
            <div className="flex flex-col gap-4">
              <div className="aspect-square rounded-xl border border-white/10 bg-black overflow-hidden relative">
                {images.length > 0 ? (
                  <Image
                    src={images[imgIndex]}
                    alt={auction.product?.title ?? ""}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    unoptimized
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/50">
                    No image
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto">
                  {images.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setImgIndex(i)}
                      className={`flex-shrink-0 w-20 h-20 rounded-md border overflow-hidden bg-black relative ${
                        i === imgIndex ? "border-white" : "border-white/15"
                      }`}
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        className="object-contain"
                        sizes="80px"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <p className="text-xs tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-2">
                  {auction.status === "live" ? "Live Auction" : auction.status}
                </p>
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                  {auction.product?.title ?? "Auction"}
                </h1>
                {auction.product?.description && (
                  <p className="text-white/75 text-sm leading-relaxed mt-4 whitespace-pre-line">
                    {auction.product.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-white/50 text-xs tracking-wider uppercase">
                    {current != null ? "Current bid" : "Starting bid"}
                  </p>
                  <p className="text-white text-4xl font-bold tabular-nums">
                    {formatCents(current ?? auction.starting_bid)}
                  </p>
                  {auction.viewer_bid && (
                    <p
                      className={`text-xs mt-1 ${
                        auction.viewer_bid.status === "winning"
                          ? "text-[#FFD700]"
                          : "text-white/60"
                      }`}
                    >
                      Your bid: {formatCents(auction.viewer_bid.amount)} ·{" "}
                      {auction.viewer_bid.status === "winning"
                        ? "You're winning"
                        : "Outbid"}
                    </p>
                  )}
                </div>
                <AuctionCountdown
                  startsAt={auction.starts_at}
                  endsAt={auction.ends_at}
                  status={auction.status}
                />
              </div>

              {canBid ? (
                <form
                  onSubmit={handleBid}
                  className="rounded-xl border border-white/10 bg-ocean-900/60 p-5 flex flex-col gap-3"
                >
                  <label
                    htmlFor="bid-input"
                    className="text-xs tracking-[0.2em] uppercase text-white/70"
                  >
                    Your bid (minimum {formatCents(minNext)})
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                        $
                      </span>
                      <input
                        id="bid-input"
                        type="number"
                        step="1"
                        min={minNext / 100}
                        value={bidInput}
                        onChange={(e) => setBidInput(e.target.value)}
                        placeholder={(minNext / 100).toFixed(0)}
                        className="w-full pl-7 pr-3 py-3 bg-ocean-950 border border-white/15 rounded-md text-white text-lg tabular-nums outline-none focus:border-white/40"
                        disabled={submitting}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 text-sm font-medium bg-blue-accent hover:bg-blue-light disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                    >
                      {submitting ? "Bidding…" : "Place bid"}
                    </button>
                  </div>
                  {submitError && (
                    <p className="text-sm text-red-300">{submitError}</p>
                  )}
                  <p className="text-xs text-white/50">
                    Winning bids are charged to your saved card after the
                    auction ends. A bid in the final two minutes extends the
                    clock by two minutes.
                  </p>
                </form>
              ) : !authLoading && !customer ? (
                <div className="rounded-xl border border-white/10 bg-ocean-900/60 p-5">
                  <p className="text-white text-sm mb-3">
                    Sign in to bid on this auction.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/login?redirect=/auctions/${auction.id}`
                      )
                    }
                    className="px-5 py-2.5 text-sm font-medium bg-blue-accent hover:bg-blue-light text-white rounded transition-colors"
                  >
                    Sign in
                  </button>
                </div>
              ) : auction.status !== "live" ? (
                <div className="rounded-xl border border-white/10 bg-ocean-900/60 p-5">
                  <p className="text-white/80 text-sm">
                    {auction.status === "scheduled"
                      ? "Bidding opens when the auction starts."
                      : "This auction is closed."}
                  </p>
                </div>
              ) : null}

              <div className="rounded-xl border border-white/10 bg-ocean-900/40 p-5">
                <h3 className="text-xs tracking-[0.2em] uppercase text-white/70 mb-3">
                  Bid history
                </h3>
                {auction.bids.length === 0 ? (
                  <p className="text-white/60 text-sm">
                    No bids yet. Be the first.
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y divide-white/5">
                    {auction.bids.slice(0, 12).map((b) => (
                      <li
                        key={b.id}
                        className="py-2 flex items-center justify-between text-sm"
                      >
                        <span className="text-white/80 font-mono text-xs">
                          {b.bidder}
                        </span>
                        <span className="text-white tabular-nums font-medium">
                          {formatCents(b.amount)}
                        </span>
                        <span className="text-white/40 text-xs hidden sm:inline">
                          {formatTime(b.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
