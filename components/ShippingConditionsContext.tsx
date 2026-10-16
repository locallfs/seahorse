"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * Resolves the visitor's live shipping conditions once, on site load, and
 * shares the result with anything that wants it.
 *
 * Location is worked out server-side from the request's own geo headers, so
 * there is no browser permission prompt and nothing for the visitor to do. One
 * request per page load, not one per component — the cart, the product page and
 * checkout all read the same answer.
 *
 * Checkout can ask again for a specific postal code once the customer has typed
 * their address; that is a different location, so it is a separate lookup.
 */

export type ShippingConditions = {
  available: boolean;
  location?: { label: string | null; postalCode: string | null; source: string };
  currentF?: number | null;
  minF?: number | null;
  maxF?: number | null;
  thermal?: "none" | "heat" | "cold";
  hold?: boolean;
  headline?: string;
  detail?: string;
  severity?: "ok" | "caution" | "hold";
  nextShipDay?: string;
  shipsToday?: boolean;
};

type ContextValue = {
  /** Conditions where the visitor is. Null until the first load resolves. */
  conditions: ShippingConditions | null;
  loading: boolean;
  /** Conditions for a specific destination postal code. */
  forPostalCode: (postalCode: string) => Promise<ShippingConditions | null>;
};

const ShippingConditionsContext = createContext<ContextValue>({
  conditions: null,
  loading: true,
  forPostalCode: async () => null,
});

export function useShippingConditions() {
  return useContext(ShippingConditionsContext);
}

async function fetchConditions(postalCode?: string): Promise<ShippingConditions | null> {
  const qs = postalCode ? `?postal=${encodeURIComponent(postalCode)}` : "";
  try {
    const res = await fetch(`/api/shipping-weather${qs}`);
    if (!res.ok) return null;
    const json = (await res.json()) as ShippingConditions;
    return json?.available ? json : null;
  } catch {
    // A forecast is a nicety. Never surface a failure.
    return null;
  }
}

export function ShippingConditionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [conditions, setConditions] = useState<ShippingConditions | null>(null);
  const [loading, setLoading] = useState(true);
  // Per-postal-code results, so re-renders and step changes don't refetch.
  const byPostalCode = useRef(new Map<string, ShippingConditions | null>());

  // Check the visitor's location as soon as the site loads.
  useEffect(() => {
    let cancelled = false;
    fetchConditions()
      .then((result) => {
        if (cancelled) return;
        setConditions(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const forPostalCode = useCallback(async (postalCode: string) => {
    const zip = String(postalCode || "").trim().slice(0, 5);
    if (!/^\d{5}$/.test(zip)) return null;

    const cache = byPostalCode.current;
    if (cache.has(zip)) return cache.get(zip) ?? null;

    const result = await fetchConditions(zip);
    cache.set(zip, result);
    return result;
  }, []);

  return (
    <ShippingConditionsContext.Provider value={{ conditions, loading, forPostalCode }}>
      {children}
    </ShippingConditionsContext.Provider>
  );
}
