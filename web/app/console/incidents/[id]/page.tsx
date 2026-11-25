import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { incidentFor } from "@/lib/queries";
import { IncidentActions } from "@/components/console/incident-actions";
import { STATE_LABEL, type State } from "@/lib/domain/states";
import { formatNaira, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/console/login");
  const { id } = await params;
  const data = await incidentFor(session, id);
  if (!data) notFound();

  const { incident, episode, receiving, transactions: txns, actions, challenges, audit, staff, institutions } = data;
  const state = incident.state as State;

  return (
    <main id="main" className="mx-auto max-w-[110rem] px-5 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <Link href="/console" className="mono-label hover:text-ink">
            ← Case queue
          </Link>
          <h1 className="mt-3 font-display text-4xl tracking-[-0.025em] text-ink">
            {STATE_LABEL[state]}
          </h1>
          <p className="mt-2 font-mono text-xs text-faint">
            {incident.id} · episode {episode.externalEpisodeId} · opened {relativeTime(incident.occurredAt)}
          </p>
        </div>
        <span className="rounded-sm border border-line-strong px-2 py-1 font-mono text-[0.6875rem] text-muted">
          {state}
        </span>
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <div className="space-y-12">
          <Section n="01" title="Signal">
            <Grid
              rows={[
                ["Event type", incident.eventType],
                ["Activation", incident.activationMethod],
                ["Confidence", incident.activationConfidence],
                ["Value band", incident.band ?? "—"],
                ["Occurred", incident.occurredAt.toISOString()],
                ["Received", incident.receivedAt.toISOString()],
                ["Delayed delivery", incident.eventType === "SUSPECTED_DURESS" ? "see raw event" : "no"],
              ]}
            />
            <p className="mt-5 max-w-[62ch] text-sm leading-relaxed text-faint">
              RECEIVED_NOT_VERIFIED is the first state. Authentication is not a verdict. UNKNOWN is
              a first-class terminal state and is never coerced into a decision.
            </p>
          </Section>

          <Section n="02" title="Correlation and transactions">
            <Grid
              rows={[
                ["Correlation", incident.correlation],
                ["Receiving institution", receiving ?? "—"],
                ["Note", incident.correlationNote ?? "—"],
              ]}
            />
            {txns.length ? (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="mono-label py-2 pr-4">Reference</th>
                      <th className="mono-label py-2 pr-4">Status</th>
                      <th className="mono-label py-2 pr-4">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.map((t) => (
                      <tr key={t.id} className="border-b border-line/60">
                        <td className="py-2.5 pr-4 font-mono text-xs text-ink">{t.ref}</td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-muted">{t.status}</td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-guard">
                          {formatNaira(t.amountMinor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-5 text-sm text-faint">No transaction correlated yet.</p>
            )}
          </Section>

          <Section n="03" title="Actions and recipient rights">
            {actions.length ? (
              <ul className="space-y-3">
                {actions.map((a) => (
                  <li key={a.id} className="border-l-2 border-line-strong pl-4">
                    <p className="font-mono text-xs text-ink">
                      {a.type} · {a.status}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Authority: <span className="font-mono text-guard">{a.authorityRef ?? "—"}</span>
                    </p>
                    {a.rationale && <p className="mt-1 text-xs text-faint">{a.rationale}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-faint">No action recorded. A signal is not an instruction.</p>
            )}
            {challenges.map((c) => (
              <p key={c.id} className="mt-5 border-l-2 border-signal/50 pl-4 text-xs leading-relaxed text-muted">
                Recipient challenge is {c.status.toLowerCase()}. Recipient notified: {c.recipientNotified ? "yes" : "no — deferred"}.
                {c.deferredUntil ? ` Deferred until ${c.deferredUntil.toISOString()}.` : ""}
              </p>
            ))}
          </Section>

          <Section n="04" title="Audit trail">
            {audit.length ? (
              <ol className="space-y-2">
                {audit.map((a) => (
                  <li key={a.id} className="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)]">
                    <span className="font-mono text-[0.6875rem] text-faint">
                      {new Date(a.createdAt).toISOString().slice(11, 19)}
                    </span>
                    <span className="font-mono text-[0.6875rem] text-muted">
                      {a.action} · {a.actorLabel}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-faint">No audit entries for this case.</p>
            )}
          </Section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mono-label mb-5">Actions available to you</p>
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <IncidentActions
              id={incident.id}
              state={state}
              correlation={incident.correlation}
              institutions={institutions.map((i) => ({ id: i.id, name: i.name }))}
              staff={staff.map((s) => ({ id: s.id, name: s.name, role: s.role }))}
              role={session.role}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline gap-3 border-b border-line pb-3">
        <span className="font-mono text-xs text-guard">{n}</span>
        <h2 className="text-base text-ink">{title}</h2>
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

function Grid({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="mono-label pt-1">{k}</dt>
          <dd className="text-sm leading-relaxed text-muted">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
