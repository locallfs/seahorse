import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchResults from "@/components/SearchResults";

export const metadata = { title: "Search — Woody's Seahorse Aquarium & Supply" };

type SearchParams = Promise<{ q?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-12">
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-2">
              Search
            </p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              {query ? `Results for “${query}”` : "Search Products"}
            </h1>
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <Suspense fallback={<p className="text-white">Loading…</p>}>
            <SearchResults query={query} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
