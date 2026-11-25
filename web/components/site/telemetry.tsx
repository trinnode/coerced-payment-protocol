"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function Telemetry() {
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "page.view", path: pathname }),
    }).catch(() => {});

    if (!("PerformanceObserver" in window)) return;
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const value =
            entry.name === "LCP"
              ? entry.startTime
              : entry.name === "INP"
                ? entry.duration
                : "value" in entry
                  ? Number((entry as PerformanceEntry & { value: number }).value)
                  : null;
          if (value === null || !Number.isFinite(value)) continue;
          fetch("/api/track", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ kind: "vitals", metric: entry.name, value, path: pathname }),
          }).catch(() => {});
        }
      });
      observer.observe({ type: "web-vital", buffered: true } as PerformanceObserverInit);
      return () => observer.disconnect();
    } catch {
      // Safari/Firefox may not support web-vital entries. Page views still work.
    }
  }, [pathname]);

  return null;
}
