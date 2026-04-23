import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductDetail from "./ProductDetail";
import { getProductByHandle, type StoreProduct } from "@/lib/products-server";

const SITE_URL = "https://www.seahorseaquariumsupply.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProductByHandle(handle);
  if (!product) {
    return { title: "Product not found — Woody's Seahorse" };
  }
  const description = product.description
    ? product.description.replace(/\s+/g, " ").trim().slice(0, 155)
    : `${product.title} — available at Woody's Seahorse Aquarium & Supply.`;
  const image = product.images?.[0]?.url ?? product.thumbnail ?? undefined;
  return {
    title: `${product.title} — Woody's Seahorse Aquarium & Supply`,
    description,
    alternates: { canonical: `${SITE_URL}/products/${product.handle}` },
    openGraph: {
      title: product.title,
      description,
      url: `${SITE_URL}/products/${product.handle}`,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
  };
}

function buildProductSchema(product: StoreProduct) {
  const offers = product.variants
    .filter((v) => v.calculated_price)
    .map((v) => {
      const price = v.calculated_price!;
      return {
        "@type": "Offer",
        url: `${SITE_URL}/products/${product.handle}`,
        price: price.calculated_amount.toFixed(2),
        priceCurrency: price.currency_code.toUpperCase(),
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
        sku: v.sku ?? undefined,
        seller: { "@type": "Organization", name: "Woody's Seahorse Aquarium & Supply" },
      };
    });

  const images = [
    ...(product.images?.map((i) => i.url) ?? []),
    ...(product.thumbnail && !product.images?.length ? [product.thumbnail] : []),
  ].filter(Boolean);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description:
      product.description?.replace(/\s+/g, " ").trim() ?? product.title,
    sku: product.variants[0]?.sku ?? product.id,
    url: `${SITE_URL}/products/${product.handle}`,
    brand: {
      "@type": "Brand",
      name: "Woody's Seahorse Aquarium & Supply",
    },
  };

  if (images.length > 0) schema.image = images;
  if (offers.length === 1) {
    schema.offers = offers[0];
  } else if (offers.length > 1) {
    const prices = offers.map((o) => parseFloat(o.price));
    schema.offers = {
      "@type": "AggregateOffer",
      lowPrice: Math.min(...prices).toFixed(2),
      highPrice: Math.max(...prices).toFixed(2),
      priceCurrency: offers[0].priceCurrency,
      offerCount: offers.length,
      offers,
    };
  }
  return schema;
}

const CATEGORY_LABELS: Record<string, string> = {
  fish: "Saltwater Fish",
  corals: "Corals",
  inverts: "Invertebrates",
  supplies: "Aquarium Supplies",
};

function buildBreadcrumbSchema(product: StoreProduct) {
  const firstCategory = product.categories?.find(
    (c) => c.handle && CATEGORY_LABELS[c.handle]
  );
  const items: Array<Record<string, unknown>> = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: SITE_URL,
    },
  ];
  if (firstCategory?.handle) {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: CATEGORY_LABELS[firstCategory.handle],
      item: `${SITE_URL}/${firstCategory.handle}`,
    });
  }
  items.push({
    "@type": "ListItem",
    position: items.length + 1,
    name: product.title,
    item: `${SITE_URL}/products/${product.handle}`,
  });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const product = await getProductByHandle(handle);

  if (!product) {
    notFound();
  }

  const schema = buildProductSchema(product);
  const breadcrumb = buildBreadcrumbSchema(product);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <nav className="text-base md:text-lg text-white mb-8 flex items-center gap-2 tracking-wide">
            <a href="/store" className="hover:text-white transition-colors">
              Store
            </a>
            <span>/</span>
            <span className="text-white">{product.title}</span>
          </nav>

          <ProductDetail product={product} />
        </div>
      </main>
      <Footer />
    </>
  );
}
