import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { incidentFor } from "@/lib/queries";
import { IncidentActions } from "@/components/console/incident-actions";
import { SlaClock } from "@/components/console/sla-clock";
import { STATE_LABEL, type State } from "@/lib/domain/states";
import { slaFor } from "@/lib/domain/incidents";
import { formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TERMINAL = ["CLOSED", "REJECTED", "RESOLVED"];

function nextAction(state: State, correlation: string, challenge: { status: string } | undefined) {
  if (TERMINAL.includes(state)) return "No action — case closed";
  if (correlation === "PENDING") return "Correlate the transfer";
  if (state === "CORRELATED" || state === "REVIEW_PENDING") return "Notify the receiving institution";
  if (state === "NOTIFIED" || state === "ACTION_REQUESTED") return "Record an action decision";
  if (challenge?.status === "OPEN") return "Release the challenge with a reason";
  if (challenge) return "Record what happened in a handover note";
  if (["ACTION_ACCEPTED", "ACTION_DECLINED", "ACTION_NOT_PERMITTED", "INVESTIGATION"].includes(state)) {
    return "Open a recipient challenge with a deferral";
  }
  return "Record what happened in a handover note";
}

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

  const {
    incident, episode, receiving, transactions: txns, actions, challenges, notes, audit, staff, institutions,
  } = data;
  const state = incident.state as State;
  const sla = slaFor(incident.occurredAt, incident.notifiedAt);
  const atRisk = sla.atRisk && !TERMINAL.includes(state);
  const amount = txns.reduce((max, t) => Math.max(max, t.amountMinor), 0);
  const challenge = challenges[0];
  const contactOverride = Boolean(episode.contactOverrideBy && episode.contactOverrideReason?.trim());

  const chronology = [
    ...notes.map((n) => ({
      key: n.note.id,
      at: n.note.createdAt,
      label: `NOTE · ${n.note.type} · ${n.note.reasonCode} · ${n.authorName}`,
      detail: n.note.body,
    })),
    ...audit.map((a) => ({
      key: String(a.id),
      at: a.createdAt,
      label: `${a.action} · ${a.actorLabel}`,
      detail: a.reasonCode ?? "",
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

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
            {incident.id} · episode {episode.externalEpisodeId} · opened {incident.occurredAt.toISOString().slice(0, 16).replace("T", " ")}
          </p>
        </div>
        <span className="rounded-sm border border-line-strong px-2 py-1 font-mono text-[0.6875rem] text-muted">
          {state}
        </span>
      </div>

      {/* One-sentence case brief: what is exposed, who has it, how long it has
          taken, and the single next required action. */}
      <p className="mt-6 border-l-2 border-guard/50 bg-surface px-4 py-3 text-sm leading-relaxed text-ink">
        {amount ? formatNaira(amount) : "No amount correlated"} ·{" "}
        <SlaClock
          occurredAt={incident.occurredAt.toISOString()}
          notifiedAt={incident.notifiedAt?.toISOString() ?? null}
          initialMinutes={sla.elapsedMinutes}
          atRisk={atRisk}
          basis={sla.basis}
        />{" "}
        elapsed · receiving {receiving ?? "not identified"} · contact{" "}
        <span
          className={`font-mono ${
            episode.contactState === "UNSAFE"
              ? "text-critical"
              : episode.contactState === "UNKNOWN"
                ? "text-signal"
                : "text-guard"
          }`}
        >
          {episode.contactState}
          {contactOverride ? " (override recorded)" : ""}
        </span>{" "}
        · next: <span className="font-mono text-guard">{nextAction(state, incident.correlation, challenge)}</span>.
      </p>
      {atRisk && (
        <p className="mt-2 font-mono text-[0.6875rem] text-critical">
          AT RISK — more than 15 minutes without notice. Escalate in the queue.
        </p>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        {/* Mobile: the action panel comes first so controls are above the fold. */}
        <div className="order-2 space-y-12 lg:order-1">
          <Section n="01" title="Signal">
            <p className="mono-label mb-5">What happened</p>
            <Grid
              rows={[
                ["Event type", incident.eventType],
                ["Activation", incident.activationMethod],
                ["Confidence", incident.activationConfidence],
                ["Value band", incident.band ?? "—"],
                ["Occurred", incident.occurredAt.toISOString()],
                ["Received", incident.receivedAt.toISOString()],
                ["Contact state", episode.contactState],
                [
                  "Contact override",
                  contactOverride ? episode.contactOverrideReason ?? "recorded" : "none",
                ],
                ["Delayed delivery", incident.eventType === "SUSPECTED_DURESS" ? "see raw event" : "no"],
              ]}
            />
            <p className="mt-5 max-w-[62ch] text-sm leading-relaxed text-faint">
              RECEIVED_NOT_VERIFIED is the first state. Authentication is not a verdict. UNKNOWN is
              a first-class terminal state and is never coerced into a decision.
            </p>
          </Section>

          <Section n="02" title="Money exposed">
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

          <Section n="03" title="Actions taken">
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
            {challenge && (
              <p className="mt-5 border-l-2 border-signal/50 pl-4 text-xs leading-relaxed text-muted">
                Recipient challenge is {challenge.status.toLowerCase()}. Recipient notified: {challenge.recipientNotified ? "yes" : "no — deferred"}.
                <br />
                Deferred until: <span className="font-mono text-ink">{challenge.deferredUntil?.toISOString() ?? "no deferral (0 hours)"}</span>
                {challenge.releasedAt && (
                  <>
                    <br />
                    Released by <span className="font-mono text-ink">{staff.find((s) => s.id === challenge.releasedBy)?.name ?? challenge.releasedBy ?? "unrecorded"}</span> at {challenge.releasedAt.toISOString()}. Why: {challenge.resolutionNote ?? "unrecorded"}.
                  </>
                )}
              </p>
            )}

            <h3 className="mono-label mt-8">Chronology</h3>
            {chronology.length ? (
              <ol className="mt-4 space-y-2">
                {chronology.map((entry) => (
                  <li key={entry.key} className="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)]">
                    <span className="font-mono text-[0.6875rem] text-faint">
                      {new Date(entry.at).toISOString().slice(11, 19)}
                    </span>
                    <span className="font-mono text-[0.6875rem] text-muted">
                      {entry.label}
                      {entry.detail && <span className="mt-1 block font-sans text-xs normal-case text-faint">{entry.detail}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-faint">No notes or audit entries for this case.</p>
            )}
          </Section>
        </div>

        <aside className="order-1 lg:order-2 lg:sticky lg:top-24 lg:self-start">
          <p className="mono-label mb-5">What you can do</p>
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <IncidentActions
              id={incident.id}
              state={state}
              correlation={incident.correlation}
              institutions={institutions.map((i) => ({ id: i.id, name: i.name }))}
              staff={staff.map((s) => ({ id: s.id, name: s.name, role: s.role }))}
              role={session.role}
              contactState={episode.contactState}
              contactOverride={contactOverride}
              contactOverrideReason={episode.contactOverrideReason}
              challenge={
                challenge
                  ? {
                      status: challenge.status,
                      deferredUntil: challenge.deferredUntil?.toISOString() ?? null,
                      releasedBy: challenge.releasedBy,
                      releasedAt: challenge.releasedAt?.toISOString() ?? null,
                      resolutionNote: challenge.resolutionNote,
                    }
                  : null
              }
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
