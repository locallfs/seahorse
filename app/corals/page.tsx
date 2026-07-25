import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import CategoryJsonLd from "@/components/CategoryJsonLd";
import ListingFilterBar from "@/components/ListingFilterBar";
import { coralsFiltersConfig } from "@/lib/filtersModel";

export const metadata = {
  title: "Live Coral for Sale",
  description:
    "Premium reef corals — LPS, SPS, softies, zoas, mushrooms. Aquacultured and wild frags shipped overnight with live arrival guarantee.",
  alternates: { canonical: "/corals" },
  openGraph: { title: "Live Coral for Sale — Woody's Seahorse", url: "/corals" },
};

export default function CoralsPage() {
  return (
    <>
      <CategoryJsonLd
        path="/corals"
        name="Live Coral"
        description="Reef corals for sale — LPS, SPS, softies, zoas, mushrooms, and rare frags."
      />
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-12">
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-2">
              Reef-Ready Livestock
            </p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Corals
            </h1>
          </div>
        </div>
        <ListingFilterBar config={coralsFiltersConfig()} activeValue={null} />
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <ProductGrid tagValues={["Coral"]} />
        </div>
      </main>
      <Footer />
    </>
  );
}
