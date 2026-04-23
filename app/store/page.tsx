import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";

export const metadata = {
  title: "Shop All — Saltwater Fish, Coral & Aquarium Supplies",
  description:
    "Browse the full Woody's Seahorse store — live saltwater fish, corals, invertebrates, and aquarium supplies. Nationwide shipping from Portland, OR.",
  alternates: { canonical: "/store" },
  openGraph: { title: "Shop All — Woody's Seahorse", url: "/store" },
};

const categories = [
  { label: "All", value: "all" },
  { label: "New Arrivals", value: "new-arrivals" },
  { label: "Saltwater Fish", value: "fish" },
  { label: "Invertebrates", value: "inverts" },
  { label: "WYSIWYG Corals", value: "corals" },
  { label: "Supplies", value: "supplies" },
];

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const active = category || "all";

  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-12">
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-2">
              All Products
            </p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Store
            </h1>
          </div>
          <div className="max-w-screen-xl mx-auto px-6 pb-0 flex gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <a
                key={cat.value}
                href={`/store${cat.value !== "all" ? `?category=${cat.value}` : ""}`}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                  active === cat.value
                    ? "border-blue-accent text-white"
                    : "border-transparent text-white hover:text-white"
                }`}
              >
                {cat.label}
              </a>
            ))}
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <ProductGrid category={active} />
        </div>
      </main>
      <Footer />
    </>
  );
}
