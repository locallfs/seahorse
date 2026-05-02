import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import CategoryJsonLd from "@/components/CategoryJsonLd";
import FishNav from "@/components/FishNav";

export const metadata = {
  title: "Saltwater Fish for Sale",
  description:
    "Shop live saltwater fish online — clownfish, tangs, wrasses, angels and more. Guaranteed live arrival, shipped nationwide from Portland, OR.",
  alternates: { canonical: "/fish" },
  openGraph: { title: "Saltwater Fish for Sale — Woody's Seahorse", url: "/fish" },
};

export default function FishPage() {
  return (
    <>
      <CategoryJsonLd
        path="/fish"
        name="Saltwater Fish"
        description="Live saltwater fish for sale — clownfish, tangs, wrasses, angels, and more."
      />
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-12">
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-2">
              Live Fish
            </p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Saltwater Fish
            </h1>
          </div>
        </div>
        <FishNav />
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <ProductGrid tagValues={["Fish"]} />
        </div>
      </main>
      <Footer />
    </>
  );
}
