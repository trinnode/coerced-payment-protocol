"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { clockLabel } from "./sla-clock";

export type QueueRow = {
  id: string;
  state: string;
  band: string | null;
  occurredAt: string;
  notifiedAt: string | null;
  correlation: string;
  actionStatus: string;
  amount: number;
  beneficiary: string | null;
  episode: string;
  customer: string;
  contact: string;
  sla: { elapsedMinutes: number; atRisk: boolean; basis: "notified" | "elapsed" };
};

export type QueueStats = { total: number; open: number; medianMinutes: number; unsafe: number };

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

type Filter = "all" | "open" | "unknown" | "unsafe";

const isOpen = (r: QueueRow) => !["CLOSED", "REJECTED", "RESOLVED"].includes(r.state);
const isUnsafe = (r: QueueRow) => r.contact === "UNSAFE";

function ContactChip({ contact }: { contact: string }) {
  const tone =
    contact === "UNSAFE"
      ? "border-critical/50 bg-critical-deep/50 text-critical"
      : contact === "UNKNOWN"
        ? "border-signal/40 bg-signal-deep/40 text-signal"
        : "border-line-strong text-muted";
  return (
    <span className={`inline-block rounded-sm border px-2 py-1 font-mono text-[0.625rem] ${tone}`}>
      {contact}
    </span>
  );
}

function StateChip({ state }: { state: string }) {
  return (
    <span
      className={`inline-block rounded-sm border px-2 py-1 font-mono text-[0.625rem] tracking-wide ${TONE[state] ?? TONE.RECEIVED}`}
    >
      {state.replaceAll("_", " ")}
    </span>
  );
}

function Age({ row }: { row: QueueRow }) {
  return (
    <span className="font-mono text-[0.6875rem] text-muted">
      {clockLabel(row.sla.elapsedMinutes)}
      {row.sla.atRisk && isOpen(row) && (
        <span className="ml-1.5 rounded-sm border border-critical/40 px-1 py-0.5 text-[0.5625rem] text-critical">
          AT RISK
        </span>
      )}
    </span>
  );
}

/** Contact first, then state and age: the three things an operator must scan
 *  before deciding whether a person is in danger or a case is overdue. */
export function QueueTable({
  rows,
  stats,
}: {
  rows: QueueRow[];
  stats: QueueStats;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const shown = useMemo(() => {
    const selected = rows.filter((r) => {
      if (filter === "unsafe") return isUnsafe(r);
      if (filter === "unknown") return r.state === "UNKNOWN" || r.correlation === "UNKNOWN";
      if (filter === "open") return isOpen(r);
      return true;
    });
    // Unsafe AND open first — urgency of person over urgency of paperwork.
    return [...selected].sort((a, b) => {
      const priority = (r: QueueRow) => (isUnsafe(r) && isOpen(r) ? 0 : isOpen(r) ? 1 : 2);
      const diff = priority(a) - priority(b);
      if (diff !== 0) return diff;
      return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
    });
  }, [rows, filter]);

  const counts: Record<Filter, number> = {
    all: rows.length,
    open: rows.filter(isOpen).length,
    unknown: rows.filter((r) => r.state === "UNKNOWN" || r.correlation === "UNKNOWN").length,
    unsafe: rows.filter(isUnsafe).length,
  };

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total cases" value={stats.total} onClick={() => setFilter("all")} active={filter === "all"} />
        <Stat label="Still open" value={stats.open} tone="signal" onClick={() => setFilter("open")} active={filter === "open"} />
        <Stat label="Median to notice" value={`${stats.medianMinutes} min`} tone="guard" />
        <Stat
          label="Unsafe contact"
          value={stats.unsafe}
          tone="critical"
          onClick={() => setFilter(filter === "unsafe" ? "all" : "unsafe")}
          active={filter === "unsafe"}
          hint="Filter queue"
        />
      </div>

      <div className="mt-10 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-sm text-ink">Incidents</h2>
        <p className="text-xs text-faint">
          Contact, then state, then age. Unsafe open cases are ranked first.
        </p>
      </div>

      <div className="mb-5 mt-5 flex flex-wrap items-center gap-2">
        {(["all", "open", "unknown", "unsafe"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wider transition-colors ${
              filter === f
                ? "border-guard/50 bg-guard-deep/40 text-guard"
                : "border-line text-faint hover:border-line-strong hover:text-ink focus-visible:border-guard focus-visible:text-guard"
            }`}
          >
            {f} · {counts[f]}
          </button>
        ))}
      </div>

      {/* One table in the DOM: rows become stacked case cards below `sm`,
          with no horizontal scroll. Amount, contact and age stay visible. */}
      <div className="rounded-[var(--radius-card)] border border-line">
        <table className="block w-full border-collapse text-left sm:table sm:min-w-[62rem]">
          <thead className="hidden sm:table-header-group">
            <tr className="border-b border-line bg-surface">
              {["Contact", "State", "Age", "Case", "Episode", "Band", "Amount", "Receiving"].map((h) => (
                <th key={h} className="mono-label px-4 py-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="block sm:table-row-group">
            {shown.map((r) => (
              <tr
                key={r.id}
                className="flex flex-col gap-2 border-b border-line/70 p-4 transition-colors hover:bg-surface/70 sm:table-row sm:gap-0 sm:p-0"
              >
                <td className="order-1 block sm:order-none sm:table-cell sm:px-4 sm:py-3.5">
                  <Link href={`/console/incidents/${r.id}`} className="font-mono text-xs text-ink hover:text-guard">
                    {r.customer}
                  </Link>
                  <p className="mt-1 font-mono text-[0.625rem] text-faint">case ···{r.id.slice(-4)}</p>
                </td>
                <td className="order-2 flex items-center sm:order-none sm:table-cell sm:px-4 sm:py-3.5">
                  <span className="mr-2 font-mono text-[0.625rem] text-faint sm:hidden">Contact</span>
                  <ContactChip contact={r.contact} />
                </td>
                <td className="order-3 flex items-center sm:order-none sm:table-cell sm:px-4 sm:py-3.5">
                  <span className="mr-2 font-mono text-[0.625rem] text-faint sm:hidden">State</span>
                  <StateChip state={r.state} />
                </td>
                <td className="order-4 flex items-center sm:order-none sm:table-cell sm:px-4 sm:py-3.5">
                  <span className="mr-2 font-mono text-[0.625rem] text-faint sm:hidden">Age</span>
                  <Age row={r} />
                </td>
                <td className="hidden px-4 py-3.5 font-mono text-[0.7rem] text-muted sm:table-cell">{r.episode}</td>
                <td className="hidden px-4 py-3.5 font-mono text-[0.7rem] text-muted sm:table-cell">{r.band ?? "—"}</td>
                <td className="order-5 flex items-baseline font-mono text-xs text-ink sm:order-none sm:table-cell sm:px-4 sm:py-3.5">
                  <span className="mr-2 font-mono text-[0.625rem] text-faint sm:hidden">Amount</span>
                  {r.amount ? `₦${Math.round(r.amount / 100).toLocaleString("en-NG")}` : "—"}
                </td>
                <td className="order-6 flex items-baseline text-xs text-muted sm:order-none sm:table-cell sm:px-4 sm:py-3.5">
                  <span className="mr-2 font-mono text-[0.625rem] text-faint sm:hidden">Receiving</span>
                  {r.beneficiary ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shown.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-faint sm:border sm:border-line sm:bg-surface">
          No cases match this filter. That is a valid state, not an error.
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "plain",
  onClick,
  active,
  hint,
}: {
  label: string;
  value: string | number;
  tone?: "plain" | "signal" | "guard" | "critical";
  onClick?: () => void;
  active?: boolean;
  hint?: string;
}) {
  const colour = {
    plain: "text-ink",
    signal: "text-signal",
    guard: "text-guard",
    critical: "text-critical",
  }[tone];
  const body = (
    <>
      <p className="mono-label">{label}</p>
      <p className={`mt-2 font-display text-3xl ${colour}`}>{value}</p>
      {hint && <p className="mt-1 font-mono text-[0.625rem] text-faint">{hint}</p>}
    </>
  );
  const className = `border-t pt-4 text-left ${active ? "border-guard" : "border-line-strong"}`;
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className={className}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}
