import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AddToCartButton from "@/components/AddToCartButton";

export const metadata = {
  title: "Product — Woody's Seahorse Aquarium & Supply",
};

// Placeholder — will be replaced with Medusa API fetch
const getProduct = (handle: string) => ({
  id: handle,
  handle,
  title: handle
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" "),
  price: 4999,
  description:
    "This is a placeholder product description. Once the Medusa backend is connected, full product details, care information, and real photos will appear here.",
  category: "fish",
  gradient: "linear-gradient(135deg, #0c1a30 0%, #0a2a4a 100%)",
  variants: [{ id: `${handle}-default`, title: "Default", price: 4999 }],
  tag: null as string | null,
});

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ProductPage({
  params,
}: {
  params: { handle: string };
}) {
  const product = getProduct(params.handle);

  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen bg-black">
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <nav className="text-xs text-slate-500 mb-8 flex items-center gap-2">
            <a href="/store" className="hover:text-slate-300 transition-colors">
              Store
            </a>
            <span>/</span>
            <span className="text-slate-300">{product.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div
              className="w-full aspect-square rounded-xl border border-white/10 flex items-center justify-center"
              style={{ background: product.gradient }}
            >
              {product.tag && (
                <span className="absolute top-4 left-4 text-xs font-medium tracking-widest uppercase bg-blue-accent/90 text-white px-3 py-1.5 rounded">
                  {product.tag}
                </span>
              )}
            </div>

            <div className="flex flex-col">
              <p className="text-xs tracking-[0.2em] uppercase text-blue-accent font-medium mb-3">
                {product.category}
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                {product.title}
              </h1>
              <p className="text-3xl font-bold text-blue-light mb-6">
                {formatPrice(product.price)}
              </p>

              <div className="border-t border-white/10 pt-6 mb-6">
                <p className="text-slate-400 leading-relaxed text-sm">
                  {product.description}
                </p>
              </div>

              <div className="bg-ocean-800/60 rounded-lg border border-white/10 p-4 mb-6 text-sm text-slate-400 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-accent" />
                  Ships 2-day or faster — live arrival guaranteed
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-accent" />
                  Held and fed before shipping
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-accent" />
                  Local pickup available
                </div>
              </div>

              <AddToCartButton product={product} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
