import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import CategoryJsonLd from "@/components/CategoryJsonLd";
import ListingFilterBar from "@/components/ListingFilterBar";
import { suppliesFiltersConfig } from "@/lib/filtersModel";

export const metadata = {
  title: "Saltwater Aquarium Supplies",
  description:
    "Reef aquarium supplies — pumps, lights, protein skimmers, salt mix, media, and test kits from AI, Red Sea, Seachem, and more.",
  alternates: { canonical: "/supplies" },
  openGraph: { title: "Saltwater Aquarium Supplies — Woody's Seahorse", url: "/supplies" },
};

export default function SuppliesPage() {
  return (
    <>
      <CategoryJsonLd
        path="/supplies"
        name="Aquarium Supplies"
        description="Saltwater aquarium supplies — pumps, lights, skimmers, salt, test kits, and media."
      />
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-12">
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-2">
              Equipment & Accessories
            </p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Aquarium Supplies
            </h1>
          </div>
        </div>
        <ListingFilterBar config={suppliesFiltersConfig()} activeValue={null} />
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <ProductGrid category="supplies" />
        </div>
      </main>
      <Footer />
    </>
  );
}
