import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import CategoryJsonLd from "@/components/CategoryJsonLd";

export const metadata = {
  title: "WYSIWYG Corals",
  description:
    "Hand-photographed reef corals — the exact frag in the image is the one shipped to you. LPS, SPS, softies, zoas, and rare specimens.",
  alternates: { canonical: "/wysiwyg-corals" },
  openGraph: { title: "WYSIWYG Corals — Woody's Seahorse", url: "/wysiwyg-corals" },
};

export default function WysiwygCoralsPage() {
  return (
    <>
      <CategoryJsonLd
        path="/wysiwyg-corals"
        name="WYSIWYG Corals"
        description="Hand-photographed coral frags — the exact frag in the image ships to you."
      />
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-12">
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-2">
              What You See Is What You Get
            </p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              WYSIWYG Corals
            </h1>
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <ProductGrid tagValues={["WYSIWYG Corals"]} />
        </div>
      </main>
      <Footer />
    </>
  );
}
