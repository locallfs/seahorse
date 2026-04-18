"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onAgree: () => void;
  agreed: boolean;
  expertItemNames: string[];
};

export default function ExpertCareAgreementModal({
  open,
  onClose,
  onAgree,
  agreed,
  expertItemNames,
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
      aria-labelledby="expert-care-title"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
    >
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg rounded-2xl border-2 bg-ocean-900 p-7 max-h-[90vh] overflow-y-auto"
        style={{
          borderColor: "#FF6B35",
          boxShadow:
            "0 0 32px rgba(255, 107, 53, 0.35), 0 10px 40px rgba(0, 0, 0, 0.6)",
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
          id="expert-care-title"
          className="text-xl md:text-2xl font-bold tracking-wide mb-4 pr-8"
          style={{ color: "#FF6B35" }}
        >
          Expert Level Care Agreement
        </h2>

        <div className="space-y-4 text-white/90 text-sm leading-relaxed mb-6">
          <p>
            Your cart contains species rated{" "}
            <span className="font-semibold text-white">Expert care level</span>. These animals
            require advanced husbandry experience and are not recommended for beginners or
            intermediate aquarists.
          </p>
          {expertItemNames.length > 0 && (
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <p className="text-xs uppercase tracking-wider text-white/60 mb-2">
                Expert-Care Items in Your Cart
              </p>
              <ul className="space-y-1">
                {expertItemNames.map((name) => (
                  <li key={name} className="text-sm text-white">
                    • {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p>
            Expert species typically require stable, mature reef systems, specialized diets,
            precise water chemistry, and diligent monitoring. Improper care frequently results
            in animal loss.
          </p>
          <p className="text-white/70 text-xs">
            By proceeding you confirm you have the experience, equipment, and resources required
            to house and care for these animals. Expert-level purchases are sold without a
            livestock guarantee.
          </p>
        </div>

        <label className="flex items-start gap-3 mb-6 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => {
              if (e.target.checked) onAgree();
            }}
            className="mt-1 w-5 h-5 rounded border-2 border-white/30 bg-transparent checked:bg-[#FF6B35] checked:border-[#FF6B35] cursor-pointer accent-[#FF6B35]"
          />
          <span className="text-white text-sm">
            I have the experience and setup required to care for Expert-level species.
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
