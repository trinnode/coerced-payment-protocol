import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { queueFor, queueStats } from "@/lib/queries";
import { QueueTable } from "@/components/console/queue-table";
import { LogoutButton } from "@/components/console/logout-button";

export const dynamic = "force-dynamic";

export default async function ConsolePage() {
  const session = await getSession();
  if (!session) redirect("/console/login");

  const [rows, stats] = await Promise.all([queueFor(session), queueStats(session)]);

  return (
    <main id="main" className="mx-auto max-w-[110rem] px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mono-label">{session.institutionName} · fraud operations</p>
          <h1 className="mt-3 font-display text-4xl tracking-[-0.025em] text-ink">
            Case queue
          </h1>
        </div>
        <LogoutButton name={session.name} role={session.role} />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total cases" value={stats.total} />
        <Stat label="Still open" value={stats.open} tone="signal" />
        <Stat label="Median to notice" value={`${stats.medianMinutes} min`} tone="guard" />
        <Stat
          label="Unsafe contact"
          value={rows.filter((r) => r.contact === "UNSAFE").length}
          tone="critical"
        />
      </div>

      <div className="mt-10 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-sm text-ink">Incidents</h2>
        <p className="text-xs text-faint">
          Scoped to {session.institutionName}. Every open is audit-logged.
        </p>
      </div>

      <div className="mt-5">
        <QueueTable
          rows={rows.map((r) => ({
            id: r.id,
            state: r.state,
            band: r.band,
            occurredAt: r.occurredAt.toISOString(),
            correlation: r.correlation,
            actionStatus: r.actionStatus,
            amount: Number(r.amount),
            beneficiary: r.beneficiary ?? null,
            episode: r.episode,
            customer: r.customer,
            contact: r.contact,
          }))}
        />
      </div>

      <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-6 text-xs text-faint">
        <Link href="/protocol" className="hover:text-ink">
          Protocol v0.1
        </Link>
        <Link href="/safety" className="hover:text-ink">
          Safety invariants
        </Link>
        <Link href="/assessment" className="hover:text-ink">
          Assessment
        </Link>
        <Link href="/" className="hover:text-ink">
          Public record
        </Link>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: string | number;
  tone?: "plain" | "signal" | "guard" | "critical";
}) {
  const colour = {
    plain: "text-ink",
    signal: "text-signal",
    guard: "text-guard",
    critical: "text-critical",
  }[tone];
  return (
    <div className="border-t border-line-strong pt-4">
      <p className="mono-label">{label}</p>
      <p className={`mt-2 font-display text-3xl ${colour}`}>{value}</p>
    </div>
  );
}
