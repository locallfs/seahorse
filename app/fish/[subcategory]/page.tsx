import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import CategoryJsonLd from "@/components/CategoryJsonLd";
import ListingFilterBar from "@/components/ListingFilterBar";
import { fishFiltersConfig } from "@/lib/filtersModel";
import {
  FISH_SUBCATEGORIES,
  findFishSubcategory,
} from "@/lib/fishCategories";

export function generateStaticParams() {
  return FISH_SUBCATEGORIES.map((c) => ({ subcategory: c.handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subcategory: string }>;
}): Promise<Metadata> {
  const { subcategory } = await params;
  const cat = findFishSubcategory(subcategory);
  if (!cat) {
    return { title: "Fish category not found" };
  }
  const path = `/fish/${cat.handle}`;
  return {
    title: `${cat.label} for Sale`,
    description: cat.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      title: `${cat.label} — Woody's Seahorse`,
      description: cat.metaDescription,
      url: path,
    },
  };
}

export default async function FishSubcategoryPage({
  params,
}: {
  params: Promise<{ subcategory: string }>;
}) {
  const { subcategory } = await params;
  const cat = findFishSubcategory(subcategory);
  if (!cat) notFound();

  return (
    <>
      <CategoryJsonLd
        path={`/fish/${cat.handle}`}
        name={`${cat.label} — Saltwater Fish`}
        description={cat.metaDescription}
      />
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-12">
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-2">
              {cat.group === "care" ? "By Care" : "Saltwater Fish"}
            </p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              {cat.label}
            </h1>
            <p className="text-white/70 text-sm mt-3 max-w-2xl">
              {cat.description}
            </p>
          </div>
        </div>
        <ListingFilterBar config={fishFiltersConfig()} activeValue={cat.handle} />
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <ProductGrid tagValues={[cat.tag]} />
        </div>
      </main>
      <Footer />
    </>
  );
}
