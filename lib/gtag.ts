type GtagItem = {
  item_id: string;
  item_name: string;
  item_variant?: string;
  price: number;
  quantity: number;
};

export function trackPurchase(params: {
  transactionId: string;
  value: number;
  currency: string;
  shipping?: number;
  tax?: number;
  items: GtagItem[];
}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "purchase", {
    transaction_id: params.transactionId,
    value: params.value,
    currency: params.currency,
    shipping: params.shipping,
    tax: params.tax,
    items: params.items,
  });
}
