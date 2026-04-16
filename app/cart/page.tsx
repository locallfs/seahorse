"use client";

import { useCart } from "@/components/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CartPage() {
  const { items, total, removeItem, updateQuantity } = useCart();

  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold text-white mb-8 tracking-tight">
            Your Cart
          </h1>

          {items.length === 0 ? (
            <div className="text-center py-32">
              <p className="text-slate-400 mb-6">Your cart is empty.</p>
              <Link
                href="/store"
                className="px-6 py-3 bg-blue-accent hover:bg-blue-light text-white text-sm font-medium rounded transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 rounded-lg border border-white/10 bg-ocean-900"
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
                        {item.title}
                      </p>
                      <p className="text-white text-sm font-semibold">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                      <div className="flex items-center gap-2 border border-white/15 rounded">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        >
                          −
                        </button>
                        <span className="text-sm text-white w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-1">
                <div className="rounded-xl border border-white/10 bg-ocean-900 p-6 sticky top-24">
                  <h2 className="text-lg font-bold text-white mb-6">
                    Order Summary
                  </h2>
                  <div className="space-y-3 text-sm mb-6">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal</span>
                      <span className="text-white">{formatPrice(total)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Shipping</span>
                      <span className="text-white">Calculated at checkout</span>
                    </div>
                  </div>
                  <div className="border-t border-white/10 pt-4 mb-6 flex justify-between font-bold text-white">
                    <span>Total</span>
                    <span className="text-white">{formatPrice(total)}</span>
                  </div>

                  <div className="bg-blue-accent/10 border border-blue-accent/20 rounded-lg p-3 mb-6 text-xs text-slate-300">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-accent" />
                      Live animal shipping — 2-day or faster only
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-accent" />
                      Local pickup available at checkout
                    </div>
                  </div>

                  <Link
                    href="/checkout"
                    className="block w-full py-4 bg-blue-accent hover:bg-blue-light text-white text-center font-medium text-sm rounded transition-colors"
                  >
                    Proceed to Checkout
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
