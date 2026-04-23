import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Page not found",
  description:
    "We couldn't find that page. Browse saltwater fish, corals, invertebrates, and aquarium supplies at Woody's Seahorse.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen flex items-center justify-center">
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-4">
            404
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-5">
            This page drifted off
          </h1>
          <p className="text-white/80 leading-relaxed mb-10">
            The page you&apos;re looking for isn&apos;t here &mdash; maybe it
            moved, or maybe the link was wrong. Here&apos;s where to go next.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Link
              href="/"
              className="px-6 py-3 bg-blue-accent hover:bg-blue-light text-white text-sm font-medium rounded transition-colors"
            >
              Back to Home
            </Link>
            <Link
              href="/store"
              className="px-6 py-3 border border-white/25 hover:border-white/50 text-white text-sm font-medium rounded transition-colors"
            >
              Shop All Products
            </Link>
            <Link
              href="/new-arrivals"
              className="px-6 py-3 border border-white/25 hover:border-white/50 text-white text-sm font-medium rounded transition-colors"
            >
              New Arrivals
            </Link>
          </div>
          <p className="text-white/60 text-sm">
            Still stuck? Email{" "}
            <a
              href="mailto:info@seahorseaquariumsupply.com"
              className="text-[#FFD700] hover:underline"
            >
              info@seahorseaquariumsupply.com
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
