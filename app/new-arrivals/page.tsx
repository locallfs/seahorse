import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";

export const metadata = { title: "New Arrivals — Woody's Seahorse Aquarium & Supply" };

export default function NewArrivalsPage() {
  return (
    <>
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
