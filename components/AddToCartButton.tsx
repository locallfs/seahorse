"use client";

import { useState } from "react";
import { useCart } from "@/components/CartContext";

interface Product {
  id: string;
  title: string;
  price: number;
  variants: { id: string; title: string; price: number }[];
}

export default function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem({
      id: product.id,
      variantId: product.variants[0].id,
      title: product.title,
      price: product.price,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleAdd}
        className={`w-full py-4 rounded font-medium text-sm tracking-wide transition-all duration-200 ${
          added
            ? "bg-green-600 text-white"
            : "bg-blue-accent hover:bg-blue-light text-white"
        }`}
      >
        {added ? "Added to Cart" : "Add to Cart"}
      </button>
      <a
        href="/cart"
        className="w-full py-4 rounded font-medium text-sm tracking-wide text-center border border-white/20 text-slate-300 hover:text-white hover:border-white/40 transition-all duration-200"
      >
        View Cart
      </a>
    </div>
  );
}
