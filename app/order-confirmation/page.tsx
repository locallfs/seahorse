"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");

  return (
    <div className="max-w-lg mx-auto px-6 py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-blue-accent/20 border border-blue-accent/40 flex items-center justify-center mx-auto mb-6">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="2"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <p className="text-sm md:text-base tracking-[0.25em] uppercase text-white font-medium mb-3">
        Order Placed
      </p>
      <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">
        Thank you for your order!
      </h1>
      {orderId && (
        <p className="text-blue-light text-sm font-medium mb-4">
          Order ID: {orderId.substring(0, 8)}...
        </p>
      )}
      <p className="text-white leading-relaxed mb-4">
        We&apos;ve received your order and will send a confirmation email
        shortly. Our team will review your order and confirm your ship date —
        live animals ship 2-day or faster only.
      </p>
      <p className="text-white text-sm mb-10">
        Questions? Email us at{" "}
        <a
          href="mailto:info@seahorseaquariumsupply.com"
          className="text-white hover:text-blue-light transition-colors"
        >
          info@seahorseaquariumsupply.com
        </a>
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/store"
          className="px-6 py-3 bg-blue-accent hover:bg-blue-light text-white text-sm font-medium rounded transition-colors"
        >
          Continue Shopping
        </Link>
        <Link
          href="/account"
          className="px-6 py-3 border border-white/20 text-white hover:text-white hover:border-white/40 text-sm font-medium rounded transition-colors"
        >
          View My Orders
        </Link>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen flex items-center justify-center">
        <Suspense
          fallback={
            <p className="text-white text-center">Loading...</p>
          }
        >
          <OrderConfirmationContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
