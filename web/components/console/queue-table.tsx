"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { relativeTime } from "@/lib/utils";

export type QueueRow = {
  id: string;
  state: string;
  band: string | null;
  occurredAt: string;
  correlation: string;
  actionStatus: string;
  amount: number;
  beneficiary: string | null;
  episode: string;
  customer: string;
  contact: string;
};

const TONE: Record<string, string> = {
  RECEIVED: "text-muted border-line-strong",
  AUTHENTICATED: "text-muted border-line-strong",
  CORRELATION_PENDING: "text-signal border-signal/40",
  CORRELATED: "text-guard border-guard/40",
  NOT_CORRELATED: "text-muted border-line-strong",
  UNKNOWN: "text-signal border-signal/40",
  REVIEW_PENDING: "text-signal border-signal/40",
  NOTIFIED: "text-guard border-guard/40",
  ACTION_REQUESTED: "text-signal border-signal/40",
  ACTION_ACCEPTED: "text-guard border-guard/40",
  ACTION_DECLINED: "text-muted border-line-strong",
  ACTION_NOT_PERMITTED: "text-muted border-line-strong",
  INVESTIGATION: "text-muted border-line-strong",
  RECIPIENT_CHALLENGE: "text-signal border-signal/40",
  RESOLVED: "text-guard border-guard/40",
  REFERRED: "text-muted border-line-strong",
  CLOSED: "text-faint border-line",
  REOPENED: "text-signal border-signal/40",
  REJECTED: "text-critical border-critical/40",
};

export function QueueTable({ rows }: { rows: QueueRow[] }) {
  const [filter, setFilter] = useState<"all" | "open" | "unknown">("all");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const shown = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "unknown") return r.state === "UNKNOWN" || r.correlation === "UNKNOWN";
    return !["CLOSED", "REJECTED", "RESOLVED"].includes(r.state);
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(["all", "open", "unknown"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wider transition-colors ${
              filter === f
                ? "border-guard/50 bg-guard-deep/40 text-guard"
                : "border-line text-faint hover:border-line-strong hover:text-ink focus-visible:border-guard focus-visible:text-guard"
            }`}
          >
            {f} {f !== "all" && `· ${rows.filter((r) => (f === "open" ? !["CLOSED", "REJECTED", "RESOLVED"].includes(r.state) : r.state === "UNKNOWN" || r.correlation === "UNKNOWN")).length}`}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line">
        <table className="w-full min-w-[62rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface">
              {["Case", "State", "Episode", "Band", "Amount", "Receiving", "Contact", "Age"].map((h) => (
                <th key={h} className="mono-label px-4 py-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-line/70 transition-colors hover:bg-surface/70">
                <td className="px-4 py-3.5">
                  <Link
                    href={`/console/incidents/${r.id}`}
                    className="font-mono text-xs text-ink hover:text-guard"
                  >
                    {r.id.slice(0, 8)}
                  </Link>
                  <p className="mt-1 font-mono text-[0.625rem] text-faint">{r.customer}</p>
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-block rounded-sm border px-2 py-1 font-mono text-[0.625rem] tracking-wide ${TONE[r.state] ?? TONE.RECEIVED}`}
                  >
                    {r.state.replaceAll("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3.5 font-mono text-[0.7rem] text-muted">{r.episode}</td>
                <td className="px-4 py-3.5 font-mono text-[0.7rem] text-muted">{r.band ?? "—"}</td>
                <td className="px-4 py-3.5 font-mono text-xs text-ink">
                  {r.amount ? `₦${Math.round(r.amount / 100).toLocaleString("en-NG")}` : "—"}
                </td>
                <td className="px-4 py-3.5 text-xs text-muted">{r.beneficiary ?? "—"}</td>
                <td className="px-4 py-3.5">
                  <span
                    className={`font-mono text-[0.6875rem] ${
                      r.contact === "UNSAFE"
                        ? "text-critical"
                        : r.contact === "UNKNOWN"
                          ? "text-signal"
                          : "text-muted"
                    }`}
                  >
                    {r.contact}
                  </span>
                </td>
                <td className="px-4 py-3.5 font-mono text-[0.6875rem] text-faint">
                  {now === null
                    ? r.occurredAt.slice(0, 16).replace("T", " ")
                    : relativeTime(r.occurredAt, new Date(now))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-faint">
            No cases match this filter. That is a valid state, not an error.
          </p>
        )}
      </div>
    </div>
  );
}
