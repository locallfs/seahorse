"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { medusa } from "@/lib/medusa";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AccountPage() {
  const router = useRouter();
  const { customer, loading: authLoading, logout } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !customer) {
      router.push("/login");
    }
  }, [authLoading, customer, router]);

  useEffect(() => {
    if (!customer) return;
    medusa.store.order
      .list({ limit: 50, fields: "id,display_id,created_at,total,status,*items" })
      .then(({ orders: o }) => setOrders(o || []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [customer]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

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
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                My Account
              </h1>
              <p className="text-white text-sm mt-1">
                {customer.first_name} {customer.last_name} &middot;{" "}
                {customer.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-white/20 text-white hover:text-white hover:border-white/40 text-sm rounded transition-colors"
            >
              Sign Out
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            <Link
              href="/account/payment-methods"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-ocean-900 hover:border-white/25 transition-colors px-6 py-5"
            >
              <div>
                <p className="text-white font-medium">Payment Methods</p>
                <p className="text-white/60 text-xs mt-1">
                  Saved cards for auctions and checkout
                </p>
              </div>
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/70">
                <path d="M2 6h8M7 3l3 3-3 3" />
              </svg>
            </Link>
          </div>

          <h2 className="text-xl font-bold text-white mb-6">Order History</h2>

          {ordersLoading ? (
            <p className="text-white py-12 text-center">
              Loading orders...
            </p>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-white/10 bg-ocean-900">
              <p className="text-white mb-4">No orders yet.</p>
              <Link
                href="/store"
                className="px-6 py-3 bg-blue-accent hover:bg-blue-light text-white text-sm font-medium rounded transition-colors"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-white/10 bg-ocean-900 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-white font-medium">
                        Order #{order.display_id}
                      </p>
                      <p className="text-white text-xs mt-0.5">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">
                        {formatPrice(order.total)}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-blue-accent/20 text-blue-light capitalize">
                        {order.status || "processing"}
                      </span>
                    </div>
                  </div>
                  {order.items?.length > 0 && (
                    <div className="border-t border-white/10 pt-3 space-y-2">
                      {order.items.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-white">
                            {item.product_title || item.title}{" "}
                            <span className="text-white">
                              x{item.quantity}
                            </span>
                          </span>
                          <span className="text-white">
                            {formatPrice(item.unit_price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
