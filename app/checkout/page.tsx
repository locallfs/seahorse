"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function StripePaymentForm({
  onComplete,
  processing,
  setProcessing,
  error,
  setError,
}: {
  onComplete: () => Promise<void>;
  processing: boolean;
  setProcessing: (v: boolean) => void;
  error: string;
  setError: (v: string) => void;
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
      <button
        onClick={handleSubmit}
        disabled={!stripe || processing}
        className="w-full py-4 bg-blue-accent hover:bg-blue-light text-white font-medium text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? "Processing payment..." : "Place Order"}
      </button>
      <p className="text-xs text-slate-500 text-center">
        Payment processing powered by Stripe. Your card details are never stored
        on our servers.
      </p>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, refreshCart, clearCart, loading: cartLoading } = useCart();

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
      setStep("shipping");
    } catch (e: any) {
      setError(e.message || "Failed to save address");
    } finally {
      setShippingLoading(false);
    }
  };

  const selectShipping = async (optionId: string) => {
    if (!cart) return;
    setSelectedShipping(optionId);
    setError("");

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

      const session = payment_collection?.payment_sessions?.find(
        (s: any) => s.provider_id === "pp_stripe_stripe"
      );

      if (session?.data?.client_secret) {
        setClientSecret(session.data.client_secret);
        setStep("payment");
      } else {
        setError("Could not initialize payment. Please try again.");
      }
    } catch (e: any) {
      setError(e.message || "Failed to initialize payment");
    }
  };

  useEffect(() => {
    if (step === "shipping" && selectedShipping) {
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

  if (cartLoading) {
    return (
      <>
        <Header />
        <main className="pt-24 min-h-screen flex items-center justify-center">
          <p className="text-slate-400">Loading...</p>
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
            <p className="text-slate-400 mb-4">Your cart is empty.</p>
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
              {/* Contact & Shipping Address */}
              <div className="rounded-xl border border-white/10 bg-ocean-900 p-6">
                <h2 className="text-base font-bold text-white mb-5">
                  Contact & Shipping
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(e) => handleField("first_name", e.target.value)}
                      disabled={step !== "address"}
                      placeholder="John"
                      className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-accent transition-colors disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) => handleField("last_name", e.target.value)}
                      disabled={step !== "address"}
                      placeholder="Smith"
                      className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-accent transition-colors disabled:opacity-50"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => handleField("email", e.target.value)}
                      disabled={step !== "address"}
                      placeholder="john@example.com"
                      className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-accent transition-colors disabled:opacity-50"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => handleField("phone", e.target.value)}
                      disabled={step !== "address"}
                      placeholder="(503) 555-0100"
                      className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-accent transition-colors disabled:opacity-50"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">
                      Address
                    </label>
                    <input
                      type="text"
                      value={form.address_1}
                      onChange={(e) => handleField("address_1", e.target.value)}
                      disabled={step !== "address"}
                      placeholder="123 Main St"
                      className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-accent transition-colors disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">
                      City
                    </label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => handleField("city", e.target.value)}
                      disabled={step !== "address"}
                      placeholder="Portland"
                      className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-accent transition-colors disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">
                      State
                    </label>
                    <input
                      type="text"
                      value={form.province}
                      onChange={(e) => handleField("province", e.target.value)}
                      disabled={step !== "address"}
                      placeholder="OR"
                      className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-accent transition-colors disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">
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
                      className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-accent transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>

                {step === "address" && (
                  <button
                    onClick={saveAddress}
                    disabled={!isAddressComplete || shippingLoading}
                    className="mt-5 w-full py-3 bg-blue-accent hover:bg-blue-light text-white font-medium text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {shippingLoading
                      ? "Saving..."
                      : "Continue to Shipping"}
                  </button>
                )}

                {step !== "address" && (
                  <button
                    onClick={() => {
                      setStep("address");
                      setClientSecret("");
                      setSelectedShipping("");
                      setShippingOptions([]);
                    }}
                    className="mt-3 text-xs text-blue-light hover:text-white transition-colors"
                  >
                    Edit address
                  </button>
                )}
              </div>

              {/* Shipping Method */}
              {(step === "shipping" || step === "payment") && (
                <div className="rounded-xl border border-white/10 bg-ocean-900 p-6">
                  <h2 className="text-base font-bold text-white mb-5">
                    Shipping Method
                  </h2>
                  <div className="bg-blue-accent/10 border border-blue-accent/20 rounded-lg p-3 mb-4 text-xs text-slate-300">
                    Live animals ship 2-day or faster only. Shipping day cutoffs
                    apply — we will contact you to confirm your ship date.
                  </div>

                  {shippingOptions.length === 0 ? (
                    <p className="text-slate-400 text-sm py-4 text-center">
                      No shipping options available for this address. Please check
                      your address or contact us.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {shippingOptions.map((option: any) => (
                        <label
                          key={option.id}
                          className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                            selectedShipping === option.id
                              ? "border-blue-accent bg-blue-accent/10"
                              : "border-white/10 hover:border-white/25"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                selectedShipping === option.id
                                  ? "border-blue-accent"
                                  : "border-white/30"
                              }`}
                            >
                              {selectedShipping === option.id && (
                                <div className="w-2 h-2 rounded-full bg-blue-accent" />
                              )}
                            </div>
                            <p className="text-sm text-white font-medium">
                              {option.name}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-blue-light">
                            {option.amount === 0
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
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Payment */}
              {step === "payment" && clientSecret && (
                <div className="rounded-xl border border-white/10 bg-ocean-900 p-6">
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
              <div className="rounded-xl border border-white/10 bg-ocean-900 p-6 sticky top-24">
                <h2 className="text-base font-bold text-white mb-5">
                  Order Summary
                </h2>
                <div className="space-y-3 mb-5">
                  {items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-400 truncate pr-2">
                        {item.product_title || item.title}{" "}
                        <span className="text-slate-600">x{item.quantity}</span>
                      </span>
                      <span className="text-white flex-shrink-0">
                        {formatPrice(item.unit_price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/10 pt-4 space-y-3 text-sm mb-5">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="text-white">
                      {formatPrice(cart?.subtotal ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Shipping</span>
                    <span className="text-white">
                      {cart?.shipping_total
                        ? formatPrice(cart.shipping_total)
                        : "—"}
                    </span>
                  </div>
                  {(cart?.tax_total ?? 0) > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Tax</span>
                      <span className="text-white">
                        {formatPrice(cart.tax_total)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="border-t border-white/10 pt-4 flex justify-between font-bold text-white">
                  <span>Total</span>
                  <span className="text-blue-light">
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
