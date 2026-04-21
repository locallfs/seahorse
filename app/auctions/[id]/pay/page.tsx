"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/components/AuthContext";
import {
  getAuctionInvoice,
  payAuction,
  formatCents,
  type AuctionInvoice,
} from "@/lib/auctions";

function remaining(expiresAt: string | null) {
  if (!expiresAt) return "";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours >= 1) return `${hours}h ${minutes}m left to pay`;
  return `${minutes}m left to pay`;
}

export default function AuctionPayPage() {
  const params = useParams();
  const router = useRouter();
  const id = (Array.isArray(params?.id) ? params.id[0] : params?.id) as string;
  const { customer, loading: authLoading } = useAuth();
  const [invoice, setInvoice] = useState<AuctionInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getAuctionInvoice(id);
      setInvoice(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id || authLoading) return;
    if (!customer) {
      router.replace(`/login?redirect=/auctions/${id}/pay`);
      return;
    }
    load();
  }, [id, customer, authLoading, router, load]);

  const handlePay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      await payAuction(id);
      setPaid(true);
    } catch (e: any) {
      setPayError(e?.message || "Payment failed. Update your card and retry.");
    } finally {
      setPaying(false);
    }
  };

  if (loading || authLoading) {
    return (
      <>
        <Header />
        <main className="pt-24 min-h-screen" />
        <Footer />
      </>
    );
  }

  if (error || !invoice) {
    return (
      <>
        <Header />
        <main className="pt-24 min-h-screen">
          <div className="max-w-screen-md mx-auto px-6 py-16 text-center">
            <p className="text-white text-lg">
              {error || "Invoice not found."}
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

  const { auction, card } = invoice;
  const alreadyPaid = paid || auction.winner_offer_status === "paid";
  const expired =
    auction.winner_offer_status === "forfeited" ||
    auction.winner_offer_status === "cascaded" ||
    (auction.winner_offer_expires_at &&
      new Date(auction.winner_offer_expires_at).getTime() < Date.now());

  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="max-w-screen-md mx-auto px-6 py-10">
          <Link
            href="/auctions"
            className="text-xs tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors"
          >
            ← All auctions
          </Link>

          <div className="mt-6 rounded-2xl border border-white/10 bg-ocean-900 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <p className="text-xs tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-1">
                You won this auction
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {auction.product?.title ?? "Auction"}
              </h1>
              {auction.winner_offer_expires_at && !alreadyPaid && !expired && (
                <p className="text-sm text-white/70 mt-2">
                  {remaining(auction.winner_offer_expires_at)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 p-6 items-start">
              <div className="aspect-square rounded-xl border border-white/10 bg-black overflow-hidden relative">
                {auction.product?.thumbnail ? (
                  <Image
                    src={auction.product.thumbnail}
                    alt={auction.product.title}
                    fill
                    className="object-contain"
                    sizes="200px"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs">
                    No image
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-white/50 text-xs tracking-wider uppercase">
                    Final bid
                  </p>
                  <p className="text-white text-3xl font-bold tabular-nums">
                    {formatCents(auction.amount)}
                  </p>
                </div>

                {card ? (
                  <div>
                    <p className="text-white/50 text-xs tracking-wider uppercase mb-1">
                      Charging
                    </p>
                    <p className="text-white text-sm">
                      {card.brand?.toUpperCase()} ending in {card.last4}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                    No card on file.{" "}
                    <Link
                      href="/account/payment-methods"
                      className="underline"
                    >
                      Add one
                    </Link>{" "}
                    to complete payment.
                  </div>
                )}

                {alreadyPaid ? (
                  <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    Payment received. We'll ship as soon as the livestock is
                    ready. You'll get a confirmation email shortly.
                  </div>
                ) : expired ? (
                  <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    Your 24-hour payment window has closed. This auction has
                    been offered to the next bidder.
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handlePay}
                      disabled={paying || !card}
                      className="px-6 py-3 text-sm font-medium bg-blue-accent hover:bg-blue-light disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                    >
                      {paying
                        ? "Charging…"
                        : `Pay ${formatCents(auction.amount)}`}
                    </button>
                    {payError && (
                      <p className="text-sm text-red-300">{payError}</p>
                    )}
                    <p className="text-xs text-white/50 leading-relaxed">
                      Pays the saved card on file. If the charge fails, update
                      your card on the{" "}
                      <Link
                        href="/account/payment-methods"
                        className="underline"
                      >
                        payment methods page
                      </Link>{" "}
                      and try again. If unpaid within 24 hours the auction
                      cascades to the next bidder.
                    </p>
                  </>
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
