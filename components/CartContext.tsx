"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { medusa } from "@/lib/medusa";
import { useAuth } from "@/components/AuthContext";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface CartContextValue {
  cart: any | null;
  loading: boolean;
  adding: boolean;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  updateQuantity: (lineItemId: string, quantity: number) => Promise<void>;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const CART_ID_KEY = "seahorse_cart_id";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const { customer, loading: authLoading } = useAuth();

  const getOrCreateCart = useCallback(async (): Promise<any> => {
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem(CART_ID_KEY)
        : null;

    if (stored) {
      try {
        const { cart: existing } = await medusa.store.cart.retrieve(stored);
        if (existing && !existing.completed_at) {
          setCart(existing);
          return existing;
        }
      } catch {
        if (typeof window !== "undefined") localStorage.removeItem(CART_ID_KEY);
      }
    }

    const { regions } = await medusa.store.region.list();
    if (!regions?.length) throw new Error("No regions configured");

    const { cart: newCart } = await medusa.store.cart.create({
      region_id: regions[0].id,
    });
    if (typeof window !== "undefined")
      localStorage.setItem(CART_ID_KEY, newCart.id);
    setCart(newCart);
    return newCart;
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!customer) {
      setCart(null);
      setLoading(false);
      return;
    }

    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }
    const stored = localStorage.getItem(CART_ID_KEY);
    if (stored) {
      medusa.store.cart
        .retrieve(stored)
        .then(({ cart: c }) => {
          if (c && !c.completed_at) {
            setCart(c);
          } else {
            localStorage.removeItem(CART_ID_KEY);
          }
        })
        .catch(() => localStorage.removeItem(CART_ID_KEY))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [customer, authLoading]);

  const refreshCart = useCallback(async () => {
    if (typeof window === "undefined") return;
    const cartId = localStorage.getItem(CART_ID_KEY);
    if (!cartId) return;
    try {
      const { cart: c } = await medusa.store.cart.retrieve(cartId, {
        fields:
          "*items,*shipping_methods,*shipping_address,*billing_address,subtotal,shipping_total,shipping_subtotal,tax_total,total,item_total,item_subtotal,discount_total,currency_code",
      });
      setCart(c);
    } catch {
      localStorage.removeItem(CART_ID_KEY);
      setCart(null);
    }
  }, []);

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      setAdding(true);
      try {
        let currentCart = cart;
        if (!currentCart) {
          currentCart = await getOrCreateCart();
        }
        const { cart: updated } = await medusa.store.cart.createLineItem(
          currentCart.id,
          { variant_id: variantId, quantity }
        );
        setCart(updated);
      } finally {
        setAdding(false);
      }
    },
    [cart, getOrCreateCart]
  );

  const removeItem = useCallback(
    async (lineItemId: string) => {
      if (!cart) return;
      const { cart: updated } = await medusa.store.cart.deleteLineItem(
        cart.id,
        lineItemId
      );
      setCart(updated);
    },
    [cart]
  );

  const updateQuantity = useCallback(
    async (lineItemId: string, quantity: number) => {
      if (!cart) return;
      if (quantity <= 0) {
        const { cart: updated } = await medusa.store.cart.deleteLineItem(
          cart.id,
          lineItemId
        );
        setCart(updated);
        return;
      }
      const { cart: updated } = await medusa.store.cart.updateLineItem(
        cart.id,
        lineItemId,
        { quantity }
      );
      setCart(updated);
    },
    [cart]
  );

  const clearCart = useCallback(() => {
    if (typeof window !== "undefined") localStorage.removeItem(CART_ID_KEY);
    setCart(null);
  }, []);

  const count =
    cart?.items?.reduce((sum: number, i: any) => sum + i.quantity, 0) ?? 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        adding,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        refreshCart,
        count,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
