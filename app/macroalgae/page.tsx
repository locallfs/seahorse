import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import CategoryJsonLd from "@/components/CategoryJsonLd";

export const metadata = {
  title: "Macroalgae for Sale",
  description:
    "Live saltwater macroalgae — chaetomorpha, caulerpa, dragon's breath, gracilaria. Refugium and display algae for nutrient export and herbivore feeding.",
  alternates: { canonical: "/macroalgae" },
  openGraph: {
    title: "Macroalgae for Sale — Woody's Seahorse",
    url: "/macroalgae",
  },
};

export default function MacroalgaePage() {
  return (
    <>
      <CategoryJsonLd
        path="/macroalgae"
        name="Macroalgae"
        description="Live macroalgae for refugiums and display tanks — chaetomorpha, caulerpa, dragon's breath, and more."
      />
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-12">
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-2">
              Live Plants
            </p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Macroalgae
            </h1>
            <p className="text-white/70 text-sm mt-3 max-w-2xl">
              Refugium and display macroalgae for nutrient export and natural
              filtration.
            </p>
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <ProductGrid tagValues={["Macro", "Macroalgae"]} />
        </div>
      </main>
      <Footer />
    </>
  );
}
