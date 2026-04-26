"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function RefreshToHome() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname === "/") return;
    const entries = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    const navType = entries[0]?.type;
    if (navType === "reload") {
      router.replace("/");
    }
  }, [pathname, router]);

  return null;
}
