"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/components/AuthContext";

type Props = {
  variantId: string;
  disabled?: boolean;
};

export default function AddToCartButton({ variantId, disabled }: Props) {
  const { addItem, adding } = useCart();
  const { customer } = useAuth();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    if (!customer) {
      router.push("/login");
      return;
    }
    try {
      await addItem(variantId, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    }
  };

  const busy = adding || disabled;

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleAdd}
        disabled={busy}
        className={`w-full py-4 rounded font-medium text-sm tracking-wide transition-all duration-200 ${
          added
            ? "bg-green-600 text-white"
            : busy
              ? "bg-blue-accent/50 text-white/50 cursor-wait"
              : "bg-blue-accent hover:bg-blue-light text-white"
        }`}
      >
        {added ? "Added to Cart" : adding ? "Adding..." : customer ? "Add to Cart" : "Sign in to Add to Cart"}
      </button>
      <a
        href="/cart"
        className="w-full py-4 rounded font-medium text-sm tracking-wide text-center border border-white/20 text-white hover:text-white hover:border-white/40 transition-all duration-200"
      >
        View Cart
      </a>
    </div>
  );
}
