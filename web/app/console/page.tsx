import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { queueFor, queueStats } from "@/lib/queries";
import { QueueTable } from "@/components/console/queue-table";
import { LogoutButton } from "@/components/console/logout-button";
import { slaFor } from "@/lib/domain/incidents";

export const dynamic = "force-dynamic";

const TERMINAL = ["CLOSED", "REJECTED", "RESOLVED"];

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

      <p className="mt-8 border-l-2 border-signal/50 pl-4 text-xs leading-relaxed text-faint">
        Synthetic records. These figures illustrate the workflow; they are not
        evidence of operational performance or safety.
      </p>

      <div className="mt-6">
        <QueueTable
          rows={rows.map((r) => {
            const sla = slaFor(r.occurredAt, r.notifiedAt);
            return {
              id: r.id,
              state: r.state,
              band: r.band,
              occurredAt: r.occurredAt.toISOString(),
              notifiedAt: r.notifiedAt?.toISOString() ?? null,
              correlation: r.correlation,
              actionStatus: r.actionStatus,
              amount: Number(r.amount),
              beneficiary: r.beneficiary ?? null,
              episode: r.episode,
              customer: r.customer,
              contact: r.contact,
              // A closed case is not an escalating case.
              sla: { ...sla, atRisk: sla.atRisk && !TERMINAL.includes(r.state) },
            };
          })}
          stats={{
            total: stats.total,
            open: stats.open,
            medianMinutes: stats.medianMinutes,
            unsafe: rows.filter((r) => r.contact === "UNSAFE").length,
          }}
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
