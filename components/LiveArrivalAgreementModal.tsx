"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onAgree: () => void;
  agreed: boolean;
};

export default function LiveArrivalAgreementModal({
  open,
  onClose,
  onAgree,
  agreed,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-arrival-title"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
    >
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg rounded-2xl border-2 bg-ocean-900 p-7 max-h-[90vh] overflow-y-auto"
        style={{
          borderColor: "#FFD700",
          boxShadow:
            "0 0 32px rgba(255, 215, 0, 0.35), 0 10px 40px rgba(0, 0, 0, 0.6)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <span className="text-xl leading-none">×</span>
        </button>

        <h2
          id="live-arrival-title"
          className="text-xl md:text-2xl font-bold tracking-wide mb-4 pr-8"
          style={{ color: "#FFD700" }}
        >
          Live Arrival Agreement
        </h2>

        <div className="space-y-4 text-white/90 text-sm leading-relaxed mb-6">
          <p>
            Your order contains live fish, coral, and/or invertebrates. Live animal orders
            require your acknowledgement of our arrival policy before we can ship.
          </p>
          <ul className="list-disc list-outside pl-5 space-y-2 text-xs text-white/90">
            <li>
              Live animals ship <span className="font-semibold text-white">Overnight only</span>;
              we will coordinate the ship date based on weather and your availability.
            </li>
            <li>
              Someone must be present to receive the box at the delivery address. Unattended
              boxes are not covered by the arrival guarantee.
            </li>
            <li>
              Report any DOA (dead on arrival) losses within{" "}
              <span className="font-semibold text-white">2 hours of delivery</span> with clear
              photos of the unopened bag and deceased animal for store credit.
            </li>
            <li>
              You agree to properly drip-acclimate all livestock. Losses from improper
              acclimation, rapid parameter change, or incompatible tankmates are not refundable.
            </li>
            <li>
              Extreme temperature forecasts (below ~35°F or above ~95°F along the route) may
              delay shipment for animal safety.
            </li>
            <li>
              <span className="font-semibold text-white">Local pickup</span> is available at
              checkout if you live within 100 miles of our Portland store — no shipping charges
              apply.
            </li>
          </ul>
          <p className="text-white/70 text-xs">
            By proceeding to checkout you acknowledge these shipping requirements and our live
            arrival guarantee policy.
          </p>
        </div>

        <label className="flex items-start gap-3 mb-6 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => {
              if (e.target.checked) onAgree();
            }}
            className="mt-1 w-5 h-5 rounded border-2 border-white/30 bg-transparent checked:bg-[#FFD700] checked:border-[#FFD700] cursor-pointer accent-[#FFD700]"
          />
          <span className="text-white text-sm">
            I understand and agree to the live arrival shipping requirements.
          </span>
        </label>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-white/20 text-white text-sm font-medium rounded hover:bg-white/5 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onAgree();
              onClose();
            }}
            disabled={!agreed}
            className="flex-1 py-3 bg-blue-accent hover:bg-blue-light disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
          >
            I Agree
          </button>
        </div>
      </div>
    </div>
  );
}
