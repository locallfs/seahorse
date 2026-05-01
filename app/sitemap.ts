import type { MetadataRoute } from "next";
import { getAllProductHandles } from "@/lib/products-server";
import { SUPPLIES_SUBCATEGORIES } from "@/lib/suppliesCategories";

const SITE_URL = "https://www.seahorseaquariumsupply.com";

export const revalidate = 3600;

const staticRoutes: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/store", changeFrequency: "daily", priority: 0.9 },
  { path: "/new-arrivals", changeFrequency: "daily", priority: 0.9 },
  { path: "/fish", changeFrequency: "daily", priority: 0.9 },
  { path: "/corals", changeFrequency: "daily", priority: 0.9 },
  { path: "/inverts", changeFrequency: "daily", priority: 0.9 },
  { path: "/supplies", changeFrequency: "weekly", priority: 0.8 },
  { path: "/wysiwyg-fish", changeFrequency: "daily", priority: 0.8 },
  { path: "/wysiwyg-corals", changeFrequency: "daily", priority: 0.8 },
  { path: "/care", changeFrequency: "monthly", priority: 0.5 },
  { path: "/maintenance", changeFrequency: "monthly", priority: 0.6 },
  { path: "/installations", changeFrequency: "monthly", priority: 0.6 },
  { path: "/pond-cleaning", changeFrequency: "monthly", priority: 0.5 },
  { path: "/tank-moving", changeFrequency: "monthly", priority: 0.5 },
  { path: "/who-we-are", changeFrequency: "yearly", priority: 0.5 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.5 },
  { path: "/shipping-returns", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const statics: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const subcategories: MetadataRoute.Sitemap = SUPPLIES_SUBCATEGORIES.map(
    (c) => ({
      url: `${SITE_URL}/supplies/${c.handle}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  const products = await getAllProductHandles();
  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/products/${p.handle}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...statics, ...subcategories, ...productEntries];
}
