"use client";

import { useState } from "react";
import { useCart } from "@/components/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const shippingOptions = [
  { id: "fedex-2day", label: "FedEx 2Day", price: 3999, note: "Arrives in 2 business days" },
  { id: "fedex-overnight", label: "FedEx Overnight", price: 5999, note: "Next business day by noon" },
  { id: "ups-2day", label: "UPS 2nd Day Air", price: 3799, note: "Arrives in 2 business days" },
  { id: "local-pickup", label: "Local Pickup", price: 0, note: "Pick up at our store — we'll notify you when ready" },
];

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const [shipping, setShipping] = useState(shippingOptions[0].id);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal">("stripe");

  const selectedShipping = shippingOptions.find((s) => s.id === shipping)!;
  const grandTotal = total + selectedShipping.price;

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="pt-24 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-400 mb-4">Your cart is empty.</p>
            <Link href="/store" className="text-blue-accent hover:text-blue-light text-sm transition-colors">
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

              <div className="rounded-xl border border-white/10 bg-ocean-900 p-6">
                <h2 className="text-base font-bold text-white mb-5">Contact & Shipping</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "First Name", placeholder: "John" },
                    { label: "Last Name", placeholder: "Smith" },
                    { label: "Email", placeholder: "john@example.com", full: true },
                    { label: "Phone", placeholder: "(503) 555-0100", full: true },
                    { label: "Address", placeholder: "123 Main St", full: true },
                    { label: "City", placeholder: "Portland" },
                    { label: "State", placeholder: "OR" },
                    { label: "ZIP", placeholder: "97201" },
                  ].map((field) => (
                    <div key={field.label} className={field.full ? "sm:col-span-2" : ""}>
                      <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-accent transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-ocean-900 p-6">
                <h2 className="text-base font-bold text-white mb-5">Shipping Method</h2>
                <div className="bg-blue-accent/10 border border-blue-accent/20 rounded-lg p-3 mb-4 text-xs text-slate-300">
                  Live animals ship 2-day or faster only. Shipping day cutoffs apply — we will contact you to confirm your ship date.
                </div>
                <div className="space-y-3">
                  {shippingOptions.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        shipping === option.id
                          ? "border-blue-accent bg-blue-accent/10"
                          : "border-white/10 hover:border-white/25"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            shipping === option.id ? "border-blue-accent" : "border-white/30"
                          }`}
                        >
                          {shipping === option.id && (
                            <div className="w-2 h-2 rounded-full bg-blue-accent" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">{option.label}</p>
                          <p className="text-xs text-slate-400">{option.note}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-blue-light">
                        {option.price === 0 ? "Free" : formatPrice(option.price)}
                      </span>
                      <input
                        type="radio"
                        name="shipping"
                        value={option.id}
                        checked={shipping === option.id}
                        onChange={() => setShipping(option.id)}
                        className="sr-only"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-ocean-900 p-6">
                <h2 className="text-base font-bold text-white mb-5">Payment</h2>
                <div className="flex gap-3 mb-6">
                  {(["stripe", "paypal"] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`flex-1 py-3 rounded text-sm font-medium border transition-all duration-200 ${
                        paymentMethod === method
                          ? "border-blue-accent bg-blue-accent/10 text-white"
                          : "border-white/15 text-slate-400 hover:text-white hover:border-white/30"
                      }`}
                    >
                      {method === "stripe" ? "Credit / Debit Card" : "PayPal"}
                    </button>
                  ))}
                </div>

                {paymentMethod === "stripe" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">Card Number</label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-accent transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">Expiry</label>
                        <input
                          type="text"
                          placeholder="MM / YY"
                          className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-accent transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">CVC</label>
                        <input
                          type="text"
                          placeholder="123"
                          className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-accent transition-colors"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      Payment processing powered by Stripe. Your card details are never stored on our servers.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm mb-4">
                      You will be redirected to PayPal to complete your payment securely.
                    </p>
                    <button className="px-8 py-3 bg-[#0070ba] hover:bg-[#005ea6] text-white text-sm font-bold rounded transition-colors">
                      Continue with PayPal
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="rounded-xl border border-white/10 bg-ocean-900 p-6 sticky top-24">
                <h2 className="text-base font-bold text-white mb-5">Order Summary</h2>
                <div className="space-y-3 mb-5">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-400 truncate pr-2">
                        {item.title} <span className="text-slate-600">×{item.quantity}</span>
                      </span>
                      <span className="text-white flex-shrink-0">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/10 pt-4 space-y-3 text-sm mb-5">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="text-white">{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Shipping</span>
                    <span className="text-white">
                      {selectedShipping.price === 0 ? "Free" : formatPrice(selectedShipping.price)}
                    </span>
                  </div>
                </div>
                <div className="border-t border-white/10 pt-4 flex justify-between font-bold text-white mb-6">
                  <span>Total</span>
                  <span className="text-blue-light">{formatPrice(grandTotal)}</span>
                </div>
                <Link
                  href="/order-confirmation"
                  className="block w-full py-4 bg-blue-accent hover:bg-blue-light text-white text-center font-medium text-sm rounded transition-colors"
                >
                  Place Order
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
