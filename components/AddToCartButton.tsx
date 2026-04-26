"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/components/AuthContext";

type Props = {
  variantId: string;
  disabled?: boolean;
  disabledLabel?: string;
};

export default function AddToCartButton({
  variantId,
  disabled,
  disabledLabel,
}: Props) {
  const { addItem, adding } = useCart();
  const { customer } = useAuth();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    if (disabled) return;
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

  const busy = adding;

  let label: string;
  if (added) label = "Added to Cart";
  else if (adding) label = "Adding...";
  else if (disabled) label = disabledLabel ?? "Unavailable";
  else if (!customer) label = "Sign in to Add to Cart";
  else label = "Add to Cart";

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleAdd}
        disabled={disabled || busy}
        className={`w-full py-4 rounded font-medium text-sm tracking-wide transition-all duration-200 glow-white ${
          added
            ? "bg-green-600 text-white"
            : disabled
              ? "bg-white/10 text-white/40 cursor-not-allowed"
              : busy
                ? "bg-blue-accent/50 text-white/50 cursor-wait"
                : "bg-blue-accent hover:bg-blue-light text-white"
        }`}
      >
        {label}
      </button>
      <a
        href="/cart"
        className="w-full py-4 rounded font-medium text-sm tracking-wide text-center border border-white/20 text-white hover:text-white hover:border-white/40 transition-all duration-200 glow-white"
      >
        View Cart
      </a>
    </div>
  );
}
