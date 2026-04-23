"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookie_consent";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function updateConsent(granted: boolean) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const value = granted ? "granted" : "denied";
  window.gtag("consent", "update", {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  });
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (!stored) setVisible(true);
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {}
    updateConsent(true);
    setVisible(false);
  };

  const reject = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "rejected");
    } catch {}
    updateConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[1000] px-4 pb-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-xl border border-white/15 bg-ocean-900/95 backdrop-blur-md shadow-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div className="flex-1 text-sm text-white leading-relaxed">
          <p className="font-semibold mb-1 text-[#FFD700] text-xs uppercase tracking-[0.2em]">
            Cookies
          </p>
          <p>
            We use cookies to measure site traffic and improve your experience.
            Read our{" "}
            <Link
              href="/privacy"
              className="underline hover:text-[#FFD700] transition-colors"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={reject}
            className="px-4 py-2.5 text-xs tracking-wider uppercase font-medium text-white/80 hover:text-white border border-white/25 hover:border-white/50 rounded transition-colors"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={accept}
            className="px-4 py-2.5 text-xs tracking-wider uppercase font-semibold bg-blue-accent hover:bg-blue-light text-white rounded transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
