"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/components/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ShippingNotice from "@/components/ShippingNotice";
import LiveArrivalAgreementModal from "@/components/LiveArrivalAgreementModal";
import ExpertCareAgreementModal from "@/components/ExpertCareAgreementModal";
import Image from "next/image";
import Link from "next/link";
import { medusa } from "@/lib/medusa";
import {
  isLiveAnimalByCategories,
  isLiveAnimalItemByText,
} from "@/lib/liveAnimal";

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function CartPage() {
  const { cart, loading, removeItem, updateQuantity, clearCart } = useCart();
  const { customer, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !customer) {
      router.replace("/login");
    }
  }, [authLoading, customer, router]);

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;

  const [liveProductIds, setLiveProductIds] = useState<Set<string>>(new Set());
  const [expertProductIds, setExpertProductIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const productIds: string[] = Array.from(
      new Set(
        items
          .map((i: any) => i.product_id as string | undefined)
          .filter((id: string | undefined): id is string => !!id),
      ),
    );
    if (productIds.length === 0) {
      setLiveProductIds(new Set());
      setExpertProductIds(new Set());
      return;
    }
    (async () => {
      try {
        const res = await medusa.store.product.list({
          id: productIds,
          fields: "id,metadata,*categories,tags.value",
          limit: productIds.length,
        } as any);
        if (cancelled) return;
        const liveSet = new Set<string>();
        const expertSet = new Set<string>();
        for (const p of (res.products as any[]) || []) {
          if (isLiveAnimalByCategories(p.categories)) liveSet.add(p.id);
          const careLevel = p?.metadata?.pads?.care_level;
          const isExpertCarePad =
            typeof careLevel === "string" &&
            careLevel.trim().toLowerCase() === "expert";
          const hasExpertTag = (p?.tags ?? []).some(
            (t: { value?: string }) =>
              typeof t?.value === "string" &&
              t.value.trim().toLowerCase() === "expert only",
          );
          if (isExpertCarePad || hasExpertTag) {
            expertSet.add(p.id);
          }
        }
        setLiveProductIds(liveSet);
        setExpertProductIds(expertSet);
      } catch {
        if (!cancelled) {
          setLiveProductIds(new Set());
          setExpertProductIds(new Set());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items.map((i: any) => i.product_id).join(",")]);

  const hasLive = items.some(
    (item: any) =>
      (item.product_id && liveProductIds.has(item.product_id)) ||
      isLiveAnimalItemByText(item),
  );

  const hasExpert = items.some(
    (item: any) => item.product_id && expertProductIds.has(item.product_id),
  );

  const expertItemNames: string[] = Array.from(
    new Set(
      items
        .filter(
          (item: any) => item.product_id && expertProductIds.has(item.product_id),
        )
        .map((item: any) => item.product_title || item.title)
        .filter((name: string | undefined): name is string => !!name),
    ),
  );

  const [liveAgreementOpen, setLiveAgreementOpen] = useState(false);
  const [liveAgreed, setLiveAgreed] = useState(false);
  const [liveAutoOpened, setLiveAutoOpened] = useState(false);

  const [expertAgreementOpen, setExpertAgreementOpen] = useState(false);
  const [expertAgreed, setExpertAgreed] = useState(false);
  const [expertAutoOpened, setExpertAutoOpened] = useState(false);

  useEffect(() => {
    if (hasLive && !liveAutoOpened && items.length > 0) {
      setLiveAgreementOpen(true);
      setLiveAutoOpened(true);
    }
    if (!hasLive) setLiveAgreed(false);
  }, [hasLive, liveAutoOpened, items.length]);

  useEffect(() => {
    if (hasExpert && !expertAutoOpened && items.length > 0 && !liveAgreementOpen) {
      setExpertAgreementOpen(true);
      setExpertAutoOpened(true);
    }
    if (!hasExpert) setExpertAgreed(false);
  }, [hasExpert, expertAutoOpened, items.length, liveAgreementOpen]);

  const canCheckout = (!hasLive || liveAgreed) && (!hasExpert || expertAgreed);

  if (authLoading || !customer) {
    return (
      <>
        <Header />
        <main className="pt-24 min-h-screen flex items-center justify-center">
          <p className="text-white">Loading...</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Your Cart
            </h1>
            {items.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Remove all items from your cart?")) {
                    clearCart();
                  }
                }}
                className="text-xs tracking-[0.2em] uppercase font-medium text-white/70 hover:text-red-400 border border-white/20 hover:border-red-400/60 rounded px-4 py-2 transition-colors"
              >
                Clear Cart
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-32">
              <p className="text-white">Loading cart...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-32">
              <p className="text-white mb-6">Your cart is empty.</p>
              <Link
                href="/store"
                className="px-6 py-3 bg-blue-accent hover:bg-blue-light text-white text-sm font-medium rounded transition-colors glow-white"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-4">
                {items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 rounded-lg border border-white/10 bg-ocean-900 glow-white"
                  >
                    <div className="w-20 h-20 rounded flex-shrink-0 bg-ocean-800 border border-white/10 overflow-hidden relative">
                      {item.thumbnail && (
                        <Image
                          src={item.thumbnail}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="80px"
                          unoptimized
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm mb-1">
                        {item.product_title || item.title}
                      </p>
                      {item.variant_title && item.variant_title !== "Default" && (
                        <p className="text-white text-xs mb-1">
                          {item.variant_title}
                        </p>
                      )}
                      <p className="text-white text-sm font-semibold">
                        {formatPrice(item.unit_price)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-white hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                      <div className="flex items-center gap-2 border border-white/15 rounded">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          className="w-10 h-10 flex items-center justify-center text-white hover:text-white transition-colors"
                        >
                          −
                        </button>
                        <span className="text-sm text-white w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          className="w-10 h-10 flex items-center justify-center text-white hover:text-white transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-1">
                <div className="rounded-xl border border-white/10 bg-ocean-900 p-6 sticky top-24 glow-white">
                  <h2 className="text-lg font-bold text-white mb-6">
                    Order Summary
                  </h2>
                  <div className="space-y-3 text-sm mb-6">
                    <div className="flex justify-between text-white">
                      <span>Subtotal</span>
                      <span className="text-white">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span>Shipping</span>
                      <span className="text-white">
                        Calculated at checkout
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-white/10 pt-4 mb-6 flex justify-between font-bold text-white">
                    <span>Total</span>
                    <span className="text-white">{formatPrice(subtotal)}</span>
                  </div>

                  <div className="mb-6 space-y-3">
                    {hasLive ? (
                      <button
                        onClick={() => setLiveAgreementOpen(true)}
                        className="w-full rounded-xl border-2 p-4 bg-ocean-900/70 text-left hover:bg-ocean-800/70 transition-colors"
                        style={{
                          borderColor: "#FFD700",
                          boxShadow:
                            "0 0 22px rgba(255, 255, 255, 0.45), 0 4px 14px rgba(0, 0, 0, 0.3)",
                        }}
                      >
                        <p
                          className="text-sm md:text-base font-bold tracking-wide mb-1 flex items-center justify-between"
                          style={{ color: "#FFD700" }}
                        >
                          <span>Live Arrival Agreement</span>
                          <span className="text-xs text-white/70 font-normal">
                            {liveAgreed ? "Agreed ✓" : "Tap to review"}
                          </span>
                        </p>
                        <p className="text-white/85 text-xs leading-relaxed">
                          Overnight shipping required for live animals. Review and agree before
                          checkout.
                        </p>
                      </button>
                    ) : (
                      <ShippingNotice hasLive={hasLive} />
                    )}

                    {hasExpert && (
                      <button
                        onClick={() => setExpertAgreementOpen(true)}
                        className="w-full rounded-xl border-2 p-4 bg-ocean-900/70 text-left hover:bg-ocean-800/70 transition-colors"
                        style={{
                          borderColor: "#FF6B35",
                          boxShadow:
                            "0 0 22px rgba(255, 107, 53, 0.35), 0 4px 14px rgba(0, 0, 0, 0.3)",
                        }}
                      >
                        <p
                          className="text-sm md:text-base font-bold tracking-wide mb-1 flex items-center justify-between"
                          style={{ color: "#FF6B35" }}
                        >
                          <span>Expert Level Care Agreement</span>
                          <span className="text-xs text-white/70 font-normal">
                            {expertAgreed ? "Agreed ✓" : "Tap to review"}
                          </span>
                        </p>
                        <p className="text-white/85 text-xs leading-relaxed">
                          Cart contains Expert-care species. Review and agree before checkout.
                        </p>
                      </button>
                    )}
                  </div>

                  {!canCheckout ? (
                    <button
                      onClick={() => {
                        if (hasLive && !liveAgreed) setLiveAgreementOpen(true);
                        else if (hasExpert && !expertAgreed) setExpertAgreementOpen(true);
                      }}
                      className="block w-full py-4 bg-white/10 border border-white/20 text-white text-center font-medium text-sm rounded hover:bg-white/15 transition-colors"
                    >
                      {hasLive && !liveAgreed
                        ? "Review Live Arrival Agreement to Continue"
                        : "Review Expert Care Agreement to Continue"}
                    </button>
                  ) : (
                    <Link
                      href="/checkout"
                      className="block w-full py-4 bg-blue-accent hover:bg-blue-light text-white text-center font-medium text-sm rounded transition-colors glow-white"
                    >
                      Proceed to Checkout
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <LiveArrivalAgreementModal
        open={liveAgreementOpen}
        onClose={() => {
          setLiveAgreementOpen(false);
          if (hasExpert && !expertAutoOpened) {
            setExpertAgreementOpen(true);
            setExpertAutoOpened(true);
          }
        }}
        onAgree={() => setLiveAgreed(true)}
        agreed={liveAgreed}
      />
      <ExpertCareAgreementModal
        open={expertAgreementOpen}
        onClose={() => setExpertAgreementOpen(false)}
        onAgree={() => setExpertAgreed(true)}
        agreed={expertAgreed}
        expertItemNames={expertItemNames}
      />
    </>
  );
}
