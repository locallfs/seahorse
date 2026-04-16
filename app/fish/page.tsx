import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";

export const metadata = { title: "Saltwater Fish — Woody's Seahorse Aquarium & Supply" };

export default function FishPage() {
  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-12">
            <p className="text-xs tracking-[0.25em] uppercase font-medium text-blue-accent mb-2">
              Live Fish
            </p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Saltwater Fish
            </h1>
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <ProductGrid category="fish" />
        </div>
      </main>
      <Footer />
    </>
  );
}
