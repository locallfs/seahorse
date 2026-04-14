import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";

export const metadata = { title: "Aquarium Supplies — Woody's Seahorse Aquarium & Supply" };

export default function SuppliesPage() {
  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen bg-black">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-12">
            <p className="text-xs tracking-[0.25em] uppercase font-medium text-blue-accent mb-2">
              Equipment & Accessories
            </p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Aquarium Supplies
            </h1>
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <ProductGrid category="supplies" />
        </div>
      </main>
      <Footer />
    </>
  );
}
