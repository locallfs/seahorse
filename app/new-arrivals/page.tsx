import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import CategoryJsonLd from "@/components/CategoryJsonLd";

export const metadata = {
  title: "New Arrivals — Fresh Fish, Corals & Inverts",
  description:
    "This week's fresh saltwater arrivals — brand new fish, corals, and invertebrates just added to our Portland, OR store and online.",
  alternates: { canonical: "/new-arrivals" },
  openGraph: { title: "New Arrivals — Woody's Seahorse", url: "/new-arrivals" },
};

export default function NewArrivalsPage() {
  return (
    <>
      <CategoryJsonLd
        path="/new-arrivals"
        name="New Arrivals"
        description="This week's new saltwater fish, corals, and invertebrates at Woody's Seahorse."
      />
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-12">
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-2">
              Just In
            </p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              New Arrivals
            </h1>
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <ProductGrid category="new-arrivals" />
        </div>
      </main>
      <Footer />
    </>
  );
}
