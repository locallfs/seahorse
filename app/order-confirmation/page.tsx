import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = {
  title: "Order Confirmed — Woody's Seahorse Aquarium & Supply",
};

export default function OrderConfirmationPage() {
  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen flex items-center justify-center">
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-accent/20 border border-blue-accent/40 flex items-center justify-center mx-auto mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>

          <p className="text-xs tracking-[0.25em] uppercase text-blue-accent font-medium mb-3">
            Order Placed
          </p>
          <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">
            Thank you for your order!
          </h1>
          <p className="text-slate-400 leading-relaxed mb-4">
            We&apos;ve received your order and will send a confirmation email shortly. Our team will review your order and confirm your ship date — live animals ship 2-day or faster only.
          </p>
          <p className="text-slate-500 text-sm mb-10">
            Questions? Email us at{" "}
            <a
              href="mailto:info@seahorseaquariumsupply.com"
              className="text-blue-accent hover:text-blue-light transition-colors"
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
              className="px-6 py-3 border border-white/20 text-slate-300 hover:text-white hover:border-white/40 text-sm font-medium rounded transition-colors"
            >
              View My Orders
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
