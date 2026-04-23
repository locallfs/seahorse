import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import CategoryJsonLd from "@/components/CategoryJsonLd";

export const metadata = {
  title: "Saltwater Invertebrates for Sale",
  description:
    "Cleanup crew and reef-safe invertebrates — shrimp, crabs, snails, urchins, starfish, and anemones. Healthy, nationally shipped livestock.",
  alternates: { canonical: "/inverts" },
  openGraph: { title: "Saltwater Invertebrates — Woody's Seahorse", url: "/inverts" },
};

export default function InvertsPage() {
  return (
    <>
      <CategoryJsonLd
        path="/inverts"
        name="Saltwater Invertebrates"
        description="Reef-safe saltwater invertebrates — shrimp, crabs, snails, urchins, starfish."
      />
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-12">
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-2">
              Inverts
            </p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Invertebrates
            </h1>
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <ProductGrid category="inverts" />
        </div>
      </main>
      <Footer />
    </>
  );
}
