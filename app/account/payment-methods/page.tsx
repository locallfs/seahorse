"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AddCardModal from "@/components/AddCardModal";
import { useAuth } from "@/components/AuthContext";
import { storeFetch } from "@/lib/storeFetch";

type PaymentMethod = {
  id: string;
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
};

function formatBrand(brand?: string) {
  if (!brand) return "Card";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { customer, loading: authLoading } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !customer) {
      router.push("/login?redirect=/account/payment-methods");
    }
  }, [authLoading, customer, router]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { payment_methods } = await storeFetch<{ payment_methods: PaymentMethod[] }>(
        "/store/payment-methods"
      );
      setMethods(payment_methods);
    } catch (e: any) {
      setError(e?.message || "Failed to load cards");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (customer) refresh();
  }, [customer, refresh]);

  const setDefault = async (id: string) => {
    setActioning(id);
    try {
      await storeFetch("/store/payment-methods/default", {
        method: "POST",
        body: { payment_method_id: id },
      });
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to set default");
    } finally {
      setActioning(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this card?")) return;
    setActioning(id);
    try {
      await storeFetch(`/store/payment-methods/${id}`, { method: "DELETE" });
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to remove card");
    } finally {
      setActioning(null);
    }
  };

  if (authLoading || !customer) {
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
        <div className="max-w-screen-md mx-auto px-6 py-12">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <Link
                href="/account"
                className="text-xs tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors"
              >
                ← Account
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mt-2">
                Payment Methods
              </h1>
              <p className="text-white/70 text-sm mt-2">
                Saved cards are used for auction bidding and checkout. We never
                store your full card number — it stays with Stripe.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="px-4 py-2.5 text-sm font-medium bg-blue-accent hover:bg-blue-light text-white rounded transition-colors whitespace-nowrap"
            >
              Add a card
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-md border border-red-500/40 bg-red-500/10 text-red-200 text-sm px-4 py-3">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col gap-3">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-lg bg-ocean-800/60 animate-pulse"
                />
              ))}
            </div>
          ) : methods.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-ocean-900/40 text-center py-16 px-6">
              <p className="text-white/80">No cards on file yet.</p>
              <p className="text-white/50 text-sm mt-1">
                Add one to start bidding on auctions.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {methods.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-ocean-900/60 px-5 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 rounded bg-white/10 flex items-center justify-center text-xs font-bold text-white tracking-wider">
                      {formatBrand(m.brand).slice(0, 4).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {formatBrand(m.brand)} •••• {m.last4}
                      </p>
                      <p className="text-white/50 text-xs">
                        Expires {String(m.exp_month).padStart(2, "0")}/
                        {String(m.exp_year).slice(-2)}
                        {m.is_default && (
                          <span className="ml-3 text-[#FFD700] font-medium">
                            Default
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!m.is_default && (
                      <button
                        type="button"
                        onClick={() => setDefault(m.id)}
                        disabled={actioning === m.id}
                        className="text-xs text-white/70 hover:text-white transition-colors disabled:opacity-50"
                      >
                        Make default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(m.id)}
                      disabled={actioning === m.id}
                      className="text-xs text-red-300 hover:text-red-200 transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
      <AddCardModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={refresh}
      />
    </>
  );
}
