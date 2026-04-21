"use client";

import { useEffect, useState } from "react";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { StripeCardElementOptions } from "@stripe/stripe-js";
import { getStripePromise } from "@/lib/stripe-client";
import { storeFetch } from "@/lib/storeFetch";

const CARD_OPTIONS: StripeCardElementOptions = {
  style: {
    base: {
      color: "#ffffff",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
      fontSize: "15px",
      "::placeholder": { color: "rgba(255,255,255,0.45)" },
      iconColor: "#ffffff",
    },
    invalid: { color: "#ff6b6b", iconColor: "#ff6b6b" },
  },
};

function CardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    storeFetch<{ client_secret: string }>("/store/payment-methods/setup-intent", {
      method: "POST",
    })
      .then((r) => setClientSecret(r.client_secret))
      .catch((e) => setError(e?.message || "Could not start card setup"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!stripe || !elements || !clientSecret) return;
    const card = elements.getElement(CardElement);
    if (!card) return;

    setSubmitting(true);
    const result = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card },
    });
    setSubmitting(false);

    if (result.error) {
      setError(result.error.message || "Card could not be saved");
      return;
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-md border border-white/15 bg-ocean-900/80 px-4 py-3.5">
        <CardElement options={CARD_OPTIONS} />
      </div>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      <p className="text-xs text-white/60">
        Your card won&apos;t be charged until you win an auction.
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || !clientSecret || submitting}
          className="px-5 py-2 text-sm font-medium bg-blue-accent hover:bg-blue-light disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
        >
          {submitting ? "Saving…" : "Save card"}
        </button>
      </div>
    </form>
  );
}

export default function AddCardModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div className="w-full max-w-md bg-ocean-950 border border-white/15 rounded-xl p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">Add a card</h3>
        <Elements stripe={getStripePromise()}>
          <CardForm
            onSuccess={() => {
              onSaved();
              onClose();
            }}
            onCancel={onClose}
          />
        </Elements>
      </div>
    </div>
  );
}
