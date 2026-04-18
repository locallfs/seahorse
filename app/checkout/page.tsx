"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useCart } from "@/components/CartContext";
import { medusa } from "@/lib/medusa";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (typeof window !== "undefined" && !STRIPE_PK) {
  console.error(
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set in the build environment"
  );
}
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function StripePaymentForm({
  onComplete,
  processing,
  setProcessing,
  error,
  setError,
  canSubmit,
  submitBlockedMessage,
}: {
  onComplete: () => Promise<void>;
  processing: boolean;
  setProcessing: (v: boolean) => void;
  error: string;
  setError: (v: string) => void;
  canSubmit: boolean;
  submitBlockedMessage: string | null;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    setError("");

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message || "Payment failed");
      setProcessing(false);
      return;
    }

    await onComplete();
  };

  return (
    <div className="space-y-4">
      <PaymentElement />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {submitBlockedMessage && (
        <p className="text-amber-300 text-xs">{submitBlockedMessage}</p>
      )}
      <button
        onClick={handleSubmit}
        disabled={!stripe || processing || !canSubmit}
        className="w-full py-4 bg-white hover:bg-white/10 text-[#d4af37] font-semibold text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed glow-white"
      >
        {processing ? "Processing payment..." : "Place Order"}
      </button>
      <p className="text-xs text-white text-center">
        Payment processing powered by Stripe. Your card details are never stored
        on our servers.
      </p>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, refreshCart, clearCart, loading: cartLoading } = useCart();
  const { customer, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !customer) {
      router.replace("/login");
    }
  }, [authLoading, customer, router]);

  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    address_1: "",
    city: "",
    province: "",
    postal_code: "",
    country_code: "us",
  });

  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [selectedShipping, setSelectedShipping] = useState("");
  const [shippingLoading, setShippingLoading] = useState(false);

  const [clientSecret, setClientSecret] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"address" | "shipping" | "payment">(
    "address"
  );
  const [liveAgreementAccepted, setLiveAgreementAccepted] = useState(false);
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null);

  const PICKUP_RADIUS_MILES = 100;

  const handleField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isAddressComplete =
    form.email &&
    form.first_name &&
    form.last_name &&
    form.address_1 &&
    form.city &&
    form.province &&
    form.postal_code;

  const saveAddress = async () => {
    if (!cart || !isAddressComplete) return;
    setShippingLoading(true);
    setError("");

    try {
      await medusa.store.cart.update(cart.id, {
        email: form.email,
        shipping_address: {
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          address_1: form.address_1,
          city: form.city,
          province: form.province,
          postal_code: form.postal_code,
          country_code: form.country_code,
        },
        billing_address: {
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          address_1: form.address_1,
          city: form.city,
          province: form.province,
          postal_code: form.postal_code,
          country_code: form.country_code,
        },
      });

      await refreshCart();

      const { shipping_options } =
        await medusa.store.fulfillment.listCartOptions({
          cart_id: cart.id,
        });

      setShippingOptions(shipping_options || []);

      const addressQuery = [
        form.address_1,
        form.city,
        form.province,
        form.postal_code,
        form.country_code,
      ]
        .filter(Boolean)
        .join(", ");
      try {
        const distRes = await fetch(
          `/api/distance?address=${encodeURIComponent(addressQuery)}`,
        );
        if (distRes.ok) {
          const { miles } = await distRes.json();
          setDistanceMiles(typeof miles === "number" ? miles : null);
        } else {
          setDistanceMiles(null);
        }
      } catch {
        setDistanceMiles(null);
      }

      setStep("shipping");
    } catch (e: any) {
      setError(e.message || "Failed to save address");
    } finally {
      setShippingLoading(false);
    }
  };

  const selectShipping = async (optionId: string) => {
    if (!cart) return;
    setError("");
    setClientSecret("");
    setSelectedShipping(optionId);

    try {
      await medusa.store.cart.addShippingMethod(cart.id, {
        option_id: optionId,
      });

      await refreshCart();
    } catch (e: any) {
      setError(e.message || "Failed to select shipping method");
    }
  };

  const initPayment = async () => {
    if (!cart) return;
    setError("");

    try {
      const { payment_collection } =
        await medusa.store.payment.initiatePaymentSession(cart, {
          provider_id: "pp_stripe_stripe",
        });

      const stripeSessions = (payment_collection?.payment_sessions || []).filter(
        (s: any) => s.provider_id === "pp_stripe_stripe"
      );

      const activeSession =
        stripeSessions.find((s: any) => s.status === "pending" || s.status === "authorized") ||
        stripeSessions[stripeSessions.length - 1];

      if (activeSession?.data?.client_secret) {
        setClientSecret(activeSession.data.client_secret);
        setStep("payment");
      } else {
        setError("Could not initialize payment. Please try again.");
      }
    } catch (e: any) {
      setError(e.message || "Failed to initialize payment");
    }
  };

  useEffect(() => {
    if (selectedShipping) {
      initPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShipping]);

  const completeOrder = async () => {
    if (!cart) return;
    try {
      const result = await medusa.store.cart.complete(cart.id);
      if (result.type === "order") {
        clearCart();
        router.push(`/order-confirmation?id=${result.order.id}`);
      } else {
        setError("Order could not be completed. Please try again.");
        setProcessing(false);
      }
    } catch (e: any) {
      setError(e.message || "Failed to complete order");
      setProcessing(false);
    }
  };

  const items = cart?.items ?? [];

  // Check if cart has live animals — prefer category lookup, fall back to keyword.
  const [hasLiveItems, setHasLiveItems] = useState(false);

  useEffect(() => {
    const LIVE_CATEGORY_HANDLES = new Set([
      "corals",
      "coral",
      "fish",
      "saltwater-fish",
      "inverts",
      "invertebrates",
      "seahorses",
    ]);
    const LIVE_KEYWORDS = [
      "fish", "coral", "invert", "shrimp", "crab", "snail", "anemone",
      "seahorse", "clown", "tang", "wrasse", "goby", "angel", "urchin",
      "starfish", "torch", "hammer", "duncan", "frogspawn", "acro",
      "zoa", "zoanthid", "mushroom", "monti", "chalice", "euphyllia",
      "gonio", "blasto", "candy cane", "leather", "xenia", "scoly",
    ];

    const keywordHit = items.some((item: any) => {
      const handle = (item.product_handle || item.variant?.product?.handle || "").toLowerCase();
      const title = (item.product_title || item.title || "").toLowerCase();
      return LIVE_KEYWORDS.some((kw) => handle.includes(kw) || title.includes(kw));
    });

    if (keywordHit) {
      setHasLiveItems(true);
      return;
    }

    const productIds = Array.from(
      new Set(items.map((i: any) => i.product_id).filter(Boolean)),
    ) as string[];
    if (productIds.length === 0) {
      setHasLiveItems(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await medusa.store.product.list({
          id: productIds,
          fields: "id,categories.handle",
        } as any);
        if (cancelled) return;
        const live = (res.products || []).some((p: any) =>
          (p.categories || []).some((c: any) =>
            LIVE_CATEGORY_HANDLES.has((c.handle || "").toLowerCase()),
          ),
        );
        setHasLiveItems(live);
      } catch {
        if (cancelled) return;
        setHasLiveItems(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  if (cartLoading || authLoading || !customer) {
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

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="pt-24 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-white mb-4">Your cart is empty.</p>
            <Link
              href="/store"
              className="text-white hover:text-blue-light text-sm transition-colors"
            >
              Back to Store
            </Link>
          </div>
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
          <h1 className="text-3xl font-bold text-white mb-8 tracking-tight">
            Checkout
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              {/* Live Animal Agreement */}
              {hasLiveItems && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6 glow-white">
                  <h2 className="text-base font-bold text-amber-300 mb-4">
                    Live Arrival Agreement
                  </h2>
                  <div className="text-sm text-white leading-relaxed space-y-3 mb-5">
                    <p>
                      Your cart contains live fish, coral, and/or invertebrates.
                      Live animal orders require your acknowledgement of our
                      arrival policy before we can ship.
                    </p>
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-white/90">
                      <li>
                        Live animals ship <strong>Overnight only</strong>; we will
                        coordinate the ship date based on weather and your
                        availability.
                      </li>
                      <li>
                        Someone must be present to receive the box at the
                        delivery address. Unattended boxes are not covered by the
                        arrival guarantee.
                      </li>
                      <li>
                        Report any DOA (dead on arrival) losses within{" "}
                        <strong>2 hours of delivery</strong> with clear photos of
                        the unopened bag and deceased animal for store credit.
                      </li>
                      <li>
                        You agree to properly drip-acclimate all livestock.
                        Losses from improper acclimation, rapid parameter change,
                        or incompatible tankmates are not refundable.
                      </li>
                      <li>
                        Extreme temperature forecasts (below ~35°F or above ~95°F
                        along the route) may delay shipment for animal safety.
                      </li>
                    </ul>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveAgreementAccepted}
                      onChange={(e) => setLiveAgreementAccepted(e.target.checked)}
                      className="mt-1 w-4 h-4 accent-amber-400"
                    />
                    <span className="text-sm text-white">
                      I have read and agree to the Live Arrival Policy above.
                    </span>
                  </label>
                </div>
              )}

              {/* Contact & Shipping Address */}
              <div className="rounded-xl border border-white/10 bg-ocean-900 p-6 glow-white">
                <h2 className="text-base font-bold text-[#d4af37] mb-5">
                  Contact & Shipping
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white mb-1.5 tracking-wide">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(e) => handleField("first_name", e.target.value)}
                      disabled={step !== "address"}
                      placeholder="John"
                      className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-base text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-accent transition-colors disabled:text-white disabled:cursor-default"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white mb-1.5 tracking-wide">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) => handleField("last_name", e.target.value)}
                      disabled={step !== "address"}
                      placeholder="Smith"
                      className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-base text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-accent transition-colors disabled:text-white disabled:cursor-default"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-white mb-1.5 tracking-wide">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => handleField("email", e.target.value)}
                      disabled={step !== "address"}
                      placeholder="john@example.com"
                      className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-base text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-accent transition-colors disabled:text-white disabled:cursor-default"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-white mb-1.5 tracking-wide">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => handleField("phone", e.target.value)}
                      disabled={step !== "address"}
                      placeholder="(503) 555-0100"
                      className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-base text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-accent transition-colors disabled:text-white disabled:cursor-default"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-white mb-1.5 tracking-wide">
                      Address
                    </label>
                    <input
                      type="text"
                      value={form.address_1}
                      onChange={(e) => handleField("address_1", e.target.value)}
                      disabled={step !== "address"}
                      placeholder="123 Main St"
                      className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-base text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-accent transition-colors disabled:text-white disabled:cursor-default"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white mb-1.5 tracking-wide">
                      City
                    </label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => handleField("city", e.target.value)}
                      disabled={step !== "address"}
                      placeholder="Portland"
                      className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-base text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-accent transition-colors disabled:text-white disabled:cursor-default"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white mb-1.5 tracking-wide">
                      State
                    </label>
                    <input
                      type="text"
                      value={form.province}
                      onChange={(e) => handleField("province", e.target.value)}
                      disabled={step !== "address"}
                      placeholder="OR"
                      className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-base text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-accent transition-colors disabled:text-white disabled:cursor-default"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white mb-1.5 tracking-wide">
                      ZIP
                    </label>
                    <input
                      type="text"
                      value={form.postal_code}
                      onChange={(e) =>
                        handleField("postal_code", e.target.value)
                      }
                      disabled={step !== "address"}
                      placeholder="97201"
                      className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-base text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-accent transition-colors disabled:text-white disabled:cursor-default"
                    />
                  </div>
                </div>

                {step === "address" && (
                  <>
                    <button
                      onClick={saveAddress}
                      disabled={
                        !isAddressComplete ||
                        shippingLoading ||
                        (hasLiveItems && !liveAgreementAccepted)
                      }
                      className="mt-5 w-full py-3 bg-white hover:bg-white/90 text-[#d4af37] font-semibold text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed glow-white"
                    >
                      {shippingLoading
                        ? "Saving..."
                        : "Continue to Shipping"}
                    </button>
                    {hasLiveItems && !liveAgreementAccepted && (
                      <p className="mt-2 text-xs text-amber-300 text-center">
                        Please acknowledge the Live Arrival Agreement above to continue.
                      </p>
                    )}
                  </>
                )}

                {step !== "address" && (
                  <button
                    onClick={() => {
                      setStep("address");
                      setClientSecret("");
                      setSelectedShipping("");
                      setShippingOptions([]);
                    }}
                    className="mt-3 text-xs text-[#FFD700] hover:text-white transition-colors"
                  >
                    Edit address
                  </button>
                )}
              </div>

              {/* Shipping Method */}
              {(step === "shipping" || step === "payment") && (
                <div className="rounded-xl border border-white/10 bg-ocean-900 p-6 glow-white">
                  <h2 className="text-base font-bold text-white mb-5">
                    Shipping Method
                  </h2>
                  {hasLiveItems && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 text-xs text-amber-200">
                      Your cart contains live animals. For the safety of your livestock,
                      only Overnight shipping or Local Pickup is available. We will
                      contact you to confirm your ship or pickup date.
                    </div>
                  )}
                  {distanceMiles !== null && distanceMiles > PICKUP_RADIUS_MILES && (
                    <div className="bg-blue-accent/10 border border-blue-accent/30 rounded-lg p-3 mb-4 text-xs text-white">
                      Your address is about {Math.round(distanceMiles)} miles from
                      our Portland shop, outside our {PICKUP_RADIUS_MILES}-mile
                      pickup radius. If you&apos;d still like to pick up in person,
                      please contact us before completing checkout.
                    </div>
                  )}

                  {(() => {
                    const pickupKeywords = [
                      "pickup",
                      "pick up",
                      "pick-up",
                      "in-store",
                      "in store",
                    ];
                    const isPickupOption = (o: any) => {
                      const name = (o.name || "").toLowerCase();
                      const providerId = (o.provider_id || "").toLowerCase();
                      return (
                        providerId.includes("manual") ||
                        pickupKeywords.some((kw) => name.includes(kw))
                      );
                    };

                    const pickupOutOfRange =
                      distanceMiles !== null && distanceMiles > PICKUP_RADIUS_MILES;

                    const rangeFiltered = pickupOutOfRange
                      ? shippingOptions.filter((o: any) => !isPickupOption(o))
                      : shippingOptions;

                    const filteredOptions = hasLiveItems
                      ? rangeFiltered.filter((o: any) => {
                          const name = (o.name || "").toLowerCase();
                          const dataId = (o.data?.id || "").toLowerCase();
                          const providerId = (o.provider_id || "").toLowerCase();
                          const overnightKeywords = [
                            "overnight",
                            "next day",
                            "next-day",
                            "nextday",
                            "1-day",
                            "1 day",
                          ];
                          const isOvernight =
                            dataId === "shippo-overnight" ||
                            providerId.includes("overnight") ||
                            overnightKeywords.some((kw) => name.includes(kw));
                          return isOvernight || isPickupOption(o);
                        })
                      : rangeFiltered;

                    return filteredOptions.length === 0 ? (
                      <p className="text-white text-sm py-4 text-center">
                        No shipping options available for this address. Please check
                        your address or contact us.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {filteredOptions.map((option: any) => {
                          const hasAmount =
                            typeof option.amount === "number" &&
                            !isNaN(option.amount);
                          return (
                          <label
                            key={option.id}
                            className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                              selectedShipping === option.id
                                ? "border-white bg-white/10"
                                : "border-white/60 hover:border-white"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  selectedShipping === option.id
                                    ? "border-white"
                                    : "border-white/60"
                                }`}
                              >
                                {selectedShipping === option.id && (
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                              </div>
                              <p className="text-sm text-white font-medium">
                                {option.name}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-white">
                              {!hasAmount
                                ? "Calculated at checkout"
                                : option.amount === 0
                                ? "Free"
                                : formatPrice(option.amount)}
                            </span>
                            <input
                              type="radio"
                              name="shipping"
                              value={option.id}
                              checked={selectedShipping === option.id}
                              onChange={() => selectShipping(option.id)}
                              className="sr-only"
                            />
                          </label>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Payment */}
              {step === "payment" && clientSecret && !stripePromise && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
                  Payment is unavailable because the Stripe publishable key is
                  missing from this deployment. Set
                  <code className="mx-1 px-1 rounded bg-black/30">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>
                  on Vercel and redeploy.
                </div>
              )}
              {step === "payment" && clientSecret && stripePromise && (
                <div className="rounded-xl border border-white/10 bg-ocean-900 p-6 glow-white">
                  <h2 className="text-base font-bold text-white mb-5">
                    Payment
                  </h2>
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: "night",
                        variables: {
                          colorPrimary: "#0ea5e9",
                          colorBackground: "#0c1929",
                          colorText: "#e2e8f0",
                          colorDanger: "#ef4444",
                          borderRadius: "6px",
                        },
                      },
                    }}
                  >
                    <StripePaymentForm
                      onComplete={completeOrder}
                      processing={processing}
                      setProcessing={setProcessing}
                      error={error}
                      setError={setError}
                      canSubmit={!hasLiveItems || liveAgreementAccepted}
                      submitBlockedMessage={
                        hasLiveItems && !liveAgreementAccepted
                          ? "Please acknowledge the Live Arrival Agreement above before placing your order."
                          : null
                      }
                    />
                  </Elements>
                </div>
              )}

              {error && step !== "payment" && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-white/10 bg-ocean-900 p-6 glow-white sticky top-24">
                <h2 className="text-base font-bold text-[#d4af37] mb-5">
                  Order Summary
                </h2>
                <div className="space-y-3 mb-5">
                  {items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-white truncate pr-2">
                        {item.product_title || item.title}{" "}
                        <span className="text-white">x{item.quantity}</span>
                      </span>
                      <span className="text-white flex-shrink-0">
                        {formatPrice(item.unit_price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/10 pt-4 space-y-3 text-sm mb-5">
                  <div className="flex justify-between text-white">
                    <span>Subtotal</span>
                    <span className="text-white">
                      {formatPrice(cart?.subtotal ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>Shipping</span>
                    <span className="text-white">
                      {cart?.shipping_total
                        ? formatPrice(cart.shipping_total)
                        : "—"}
                    </span>
                  </div>
                  {(cart?.tax_total ?? 0) > 0 && (
                    <div className="flex justify-between text-white">
                      <span>Tax</span>
                      <span className="text-white">
                        {formatPrice(cart.tax_total)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="border-t border-white/10 pt-4 flex justify-between font-bold text-white">
                  <span>Total</span>
                  <span className="text-white">
                    {formatPrice(cart?.total ?? cart?.subtotal ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
