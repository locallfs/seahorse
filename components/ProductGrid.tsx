"use client";

import Link from "next/link";
import Image from "next/image";

const placeholderProducts = [
  { id: "1", handle: "ocellaris-clownfish", title: "Ocellaris Clownfish", price: 2499, category: "fish", img: "https://picsum.photos/seed/fish1/400/400" },
  { id: "2", handle: "yellow-tang", title: "Yellow Tang", price: 7999, category: "fish", img: "https://picsum.photos/seed/fish2/400/400" },
  { id: "3", handle: "blue-hippo-tang", title: "Blue Hippo Tang", price: 5999, category: "fish", img: "https://picsum.photos/seed/fish3/400/400" },
  { id: "4", handle: "flame-angelfish", title: "Flame Angelfish", price: 12999, category: "fish", img: "https://picsum.photos/seed/fish4/400/400" },
  { id: "5", handle: "mandarin-dragonet", title: "Mandarin Dragonet", price: 4999, category: "fish", tag: "New", img: "https://picsum.photos/seed/fish5/400/400" },
  { id: "6", handle: "lyretail-anthias", title: "Lyretail Anthias", price: 5999, category: "fish", tag: "New", img: "https://picsum.photos/seed/fish6/400/400" },
  { id: "7", handle: "purple-tang", title: "Purple Tang", price: 18999, category: "fish", tag: "New", img: "https://picsum.photos/seed/fish7/400/400" },
  { id: "8", handle: "royal-gramma", title: "Royal Gramma", price: 2999, category: "fish", img: "https://picsum.photos/seed/fish8/400/400" },
  { id: "9", handle: "scarlet-cleaner-shrimp", title: "Scarlet Skunk Cleaner Shrimp", price: 3499, category: "inverts", img: "https://picsum.photos/seed/inv1/400/400" },
  { id: "10", handle: "emerald-crab", title: "Emerald Crab", price: 1299, category: "inverts", img: "https://picsum.photos/seed/inv2/400/400" },
  { id: "11", handle: "turbo-snail", title: "Turbo Snail", price: 699, category: "inverts", img: "https://picsum.photos/seed/inv3/400/400" },
  { id: "12", handle: "peppermint-shrimp", title: "Peppermint Shrimp", price: 1499, category: "inverts", img: "https://picsum.photos/seed/inv4/400/400" },
  { id: "13", handle: "sea-urchin", title: "Sea Urchin", price: 2499, category: "inverts", img: "https://picsum.photos/seed/inv5/400/400" },
  { id: "14", handle: "hammer-coral", title: "Hammer Coral — Branching", price: 7999, category: "corals", tag: "WYSIWYG", img: "https://picsum.photos/seed/coral1/400/400" },
  { id: "15", handle: "torch-coral-gold", title: "Torch Coral — Gold", price: 14999, category: "corals", tag: "WYSIWYG", img: "https://picsum.photos/seed/coral2/400/400" },
  { id: "16", handle: "frogspawn-coral", title: "Frogspawn Coral", price: 8999, category: "corals", tag: "WYSIWYG", img: "https://picsum.photos/seed/coral3/400/400" },
  { id: "17", handle: "brain-coral", title: "Brain Coral — Trachyphyllia", price: 11999, category: "corals", tag: "WYSIWYG", img: "https://picsum.photos/seed/coral4/400/400" },
  { id: "18", handle: "mushroom-coral", title: "Mushroom Coral — Rainbow", price: 5999, category: "corals", tag: "WYSIWYG", img: "https://picsum.photos/seed/coral5/400/400" },
  { id: "19", handle: "acropora-tricolor", title: "Acropora — Tri-Color", price: 19999, category: "corals", tag: "WYSIWYG", img: "https://picsum.photos/seed/coral6/400/400" },
  { id: "20", handle: "zoa-garden", title: "Zoa Garden — Mixed", price: 6999, category: "corals", tag: "WYSIWYG", img: "https://picsum.photos/seed/coral7/400/400" },
  { id: "21", handle: "ai-prime-16hd", title: "AI Prime 16HD LED Reef Light", price: 24999, category: "supplies", img: "https://picsum.photos/seed/sup1/400/400" },
  { id: "22", handle: "protein-skimmer-150", title: "Protein Skimmer — 150 Gal", price: 18999, category: "supplies", img: "https://picsum.photos/seed/sup2/400/400" },
  { id: "23", handle: "reef-salt-mix", title: "Reef Salt Mix — 200 Gal", price: 6499, category: "supplies", img: "https://picsum.photos/seed/sup3/400/400" },
  { id: "24", handle: "sicce-wave-pump", title: "Sicce Wave Pump", price: 8999, category: "supplies", img: "https://picsum.photos/seed/sup4/400/400" },
  { id: "25", handle: "rodi-filter", title: "RO/DI Water Filter System", price: 19999, category: "supplies", img: "https://picsum.photos/seed/sup5/400/400" },
];

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ProductGrid({ category }: { category: string }) {
  const filtered =
    category === "new-arrivals"
      ? placeholderProducts.filter((p) => p.tag === "New" || p.tag === "WYSIWYG")
      : category === "all"
      ? placeholderProducts
      : placeholderProducts.filter((p) => p.category === category);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-32">
        <p className="text-slate-400">No products found in this category.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {filtered.map((product) => (
        <Link key={product.id} href={`/products/${product.handle}`} className="group">
          <div className="rounded-lg border border-white/10 group-hover:border-white/30 overflow-hidden transition-all duration-300">
            <div className="w-full aspect-square relative bg-ocean-800">
              <Image
                src={product.img}
                alt={product.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              {product.tag && (
                <span className="absolute top-2 left-2 text-[10px] font-medium tracking-widest uppercase bg-blue-accent/90 text-white px-2 py-1 rounded z-10">
                  {product.tag}
                </span>
              )}
            </div>
            <div className="p-3 bg-ocean-900">
              <p className="text-sm text-white font-medium leading-snug mb-1 group-hover:text-blue-light transition-colors">
                {product.title}
              </p>
              <p className="text-sm text-blue-accent font-semibold">
                {formatPrice(product.price)}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
