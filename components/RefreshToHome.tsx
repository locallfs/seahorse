"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RefreshToHome() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname === "/") return;
    const entries = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    const navType = entries[0]?.type;
    if (navType === "reload") {
      router.replace("/");
    }
    // Mount-only: navigation type reflects the initial page load, never the
    // current SPA navigation, so re-checking on pathname change would
    // incorrectly redirect every in-app click after a refresh.
  }, [router]);

  return null;
}
