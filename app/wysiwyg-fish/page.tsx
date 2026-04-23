import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import CategoryJsonLd from "@/components/CategoryJsonLd";

export const metadata = {
  title: "WYSIWYG Saltwater Fish",
  description:
    "What-You-See-Is-What-You-Get saltwater fish. Each fish is photographed individually — the one in the picture is the one you'll receive.",
  alternates: { canonical: "/wysiwyg-fish" },
  openGraph: { title: "WYSIWYG Saltwater Fish — Woody's Seahorse", url: "/wysiwyg-fish" },
};

export default function WysiwygFishPage() {
  return (
    <>
      <CategoryJsonLd
        path="/wysiwyg-fish"
        name="WYSIWYG Saltwater Fish"
        description="Individually photographed saltwater fish — exactly the one you'll receive."
      />
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-12">
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-2">
              What You See Is What You Get
            </p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              WYSIWYG Fish
            </h1>
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <ProductGrid tagValues={["WYSIWYG Fish"]} />
        </div>
      </main>
      <Footer />
    </>
  );
}
