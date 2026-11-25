"use client";

import { useEffect, useState } from "react";

/** Display-only formatter. The AT RISK decision itself is made in the domain
 *  layer (SLA_AT_RISK_MINUTES) and passed in — the UI never invents a verdict. */
export function clockLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
}

export function SlaClock({
  occurredAt,
  notifiedAt,
  initialMinutes,
  atRisk,
  basis,
}: {
  occurredAt: string;
  notifiedAt: string | null;
  initialMinutes: number;
  atRisk: boolean;
  basis: "notified" | "elapsed";
}) {
  const [minutes, setMinutes] = useState(initialMinutes);

  useEffect(() => {
    const tick = () => {
      const end = notifiedAt ? new Date(notifiedAt).getTime() : Date.now();
      setMinutes(Math.max(0, Math.floor((end - new Date(occurredAt).getTime()) / 60_000)));
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [occurredAt, notifiedAt]);

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span
        className="font-mono text-sm text-ink"
        title={basis === "notified" ? "Occurrence to notice" : "Still awaiting notice — clock running"}
      >
        {clockLabel(minutes)}
      </span>
      {atRisk && (
        <span className="rounded-sm border border-critical/40 bg-critical-deep/40 px-1.5 py-0.5 font-mono text-[0.625rem] text-critical">
          AT RISK
        </span>
      )}
    </span>
  );
}
