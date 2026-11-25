"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; name: string; role?: string };
type ChallengeState = {
  status: string;
  deferredUntil: string | null;
  releasedBy: string | null;
  releasedAt: string | null;
  resolutionNote: string | null;
};

export function IncidentActions({
  id,
  state,
  correlation,
  institutions,
  staff,
  role,
  contactState,
  contactOverride,
  contactOverrideReason,
  challenge,
}: {
  id: string;
  state: string;
  correlation: string;
  institutions: Option[];
  staff: Option[];
  role: string;
  contactState: string;
  contactOverride: boolean;
  contactOverrideReason: string | null;
  challenge: ChallengeState | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);

  const [corrStatus, setCorrStatus] = useState("CORRELATED");
  const [txnRef, setTxnRef] = useState("");
  const [txnAmount, setTxnAmount] = useState("");
  const [receiving, setReceiving] = useState(institutions[0]?.id ?? "");
  const [authority, setAuthority] = useState("");
  const [rule, setRule] = useState("");
  const [rationale, setRationale] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const [assignee, setAssignee] = useState(staff[0]?.id ?? "");

  const [nextContact, setNextContact] = useState(contactState);
  const [contactReason, setContactReason] = useState("");
  const [contactOverrideRequested, setContactOverrideRequested] = useState(false);

  const [deferHours, setDeferHours] = useState("6");
  const [challengeNote, setChallengeNote] = useState("");
  const [releaseReason, setReleaseReason] = useState("");
  const [earlyRelease, setEarlyRelease] = useState(false);

  const [noteBody, setNoteBody] = useState("");
  const [noteReason, setNoteReason] = useState("");
  const [noteType, setNoteType] = useState("HANDOVER");

  const blocked = contactState === "UNSAFE" && !contactOverride;
  const deferralHours = Number(deferHours);

  async function send(intent: string, payload: Record<string, unknown>, label: string) {
    setBusy(intent);
    setMessage(null);
    const res = await fetch(`/api/incidents/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intent, ...payload }),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMessage({ text: json.error?.message ?? `Could not ${label}`, bad: true });
      return;
    }
    setMessage({ text: `${label} recorded.`, bad: false });
    router.refresh();
  }

  const field =
    "mt-1.5 w-full rounded-md border border-line-strong bg-base px-3 py-2 font-mono text-xs text-ink focus:border-guard";
  const label = "mono-label block normal-case tracking-normal";

  return (
    <div className="space-y-6">
      <div aria-live="polite" aria-atomic="true" className="min-h-4 text-xs">
        {message && !message.bad && <span className="text-guard">{message.text}</span>}
      </div>
      {message?.bad && (
        <p role="alert" className="border-l-2 border-critical pl-3 text-xs text-critical">
          {message.text}
        </p>
      )}

      {role === "analyst" && (
        <p className="border-l-2 border-signal/50 pl-4 text-xs leading-relaxed text-faint">
          Your role is read-only for case decisions. A supervisor or compliance
          officer must record actions, correlations, notifications and closure.
        </p>
      )}

      <Block n="01" title="Contact safety">
        <p className="text-xs leading-relaxed text-muted">
          Current: <span className="font-mono text-ink">{contactState}</span>
          {contactOverride && (
            <>
              {" "}with a recorded override: <span className="font-mono text-signal">{contactOverrideReason}</span>
            </>
          )}
        </p>
        {blocked && (
          <p className="mt-2 border-l-2 border-critical pl-3 text-xs text-critical">
            Notification and recipient challenge are blocked until a supervisor records an override.
          </p>
        )}
        <label className={`${label} mt-4`}>
          Set state
          <select value={nextContact} onChange={(e) => setNextContact(e.target.value)} className={field}>
            {["SAFE", "UNSAFE", "UNKNOWN"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className={`${label} mt-3`}>
          Reason (recorded in the audit trail)
          <input value={contactReason} onChange={(e) => setContactReason(e.target.value)} className={field} placeholder="Customer confirmed safe / contact still unsafe" />
        </label>
        <label className="mt-3 flex items-start gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={contactOverrideRequested}
            onChange={(e) => setContactOverrideRequested(e.target.checked)}
            className="mt-0.5 accent-[var(--color-guard)]"
          />
          Record a supervisor override of UNSAFE contact
        </label>
        <button
          disabled={role === "analyst" || busy !== null || !contactReason.trim() || (contactOverrideRequested && nextContact !== "UNSAFE")}
          onClick={() =>
            send(
              "set_contact",
              { state: nextContact, reason: contactReason, override: contactOverrideRequested },
              "Contact state",
            )
          }
          className={btn(busy)}
        >
          Record contact state
        </button>
      </Block>

      <Block n="02" title="Correlate a transfer">
        {correlation === "PENDING" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={label}>
                Result
                <select value={corrStatus} onChange={(e) => setCorrStatus(e.target.value)} className={field}>
                  <option value="CORRELATED">Correlated</option>
                  <option value="NOT_CORRELATED">Not correlated</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
              </label>
              <label className={label}>
                NIP reference
                <input value={txnRef} onChange={(e) => setTxnRef(e.target.value)} className={field} placeholder="NIP-8f3a…" />
              </label>
              <label className={label}>
                Amount (₦)
                <input value={txnAmount} onChange={(e) => setTxnAmount(e.target.value)} className={field} inputMode="numeric" placeholder="48000" />
              </label>
            </div>
            <button
              disabled={role === "analyst" || busy !== null || (corrStatus === "CORRELATED" && (!txnRef || !txnAmount))}
              onClick={() =>
                send(
                  "correlate",
                  {
                    status: corrStatus,
                    transaction:
                      corrStatus === "CORRELATED"
                        ? {
                            ref: txnRef,
                            status: "COMPLETED",
                            amountMinor: Math.round(Number(txnAmount) * 100),
                            beneficiaryInstitutionId: receiving,
                          }
                        : undefined,
                  },
                  "Correlation",
                )
              }
              className={btn(busy)}
            >
              Record correlation
            </button>
          </>
        ) : (
          <p className="text-xs text-faint">Correlation is {correlation}. UNKNOWN remains a valid answer.</p>
        )}
      </Block>

      {(state === "CORRELATED" || state === "REVIEW_PENDING") && (
        <Block n="03" title="Notify the receiving institution">
          <label className={label}>
            Receiving institution
            <select value={receiving} onChange={(e) => setReceiving(e.target.value)} className={field}>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={role === "analyst" || busy !== null || !receiving || blocked}
            onClick={() => send("notify", { receivingInstitutionId: receiving }, "Notification")}
            className={btn(busy)}
          >
            Send signed notice
          </button>
          <p className="mt-3 text-[0.7rem] leading-relaxed text-faint">
            This produces a fast human referral. It does not place a hold.
            {blocked && " Unsafe contact is blocking this step."}
          </p>
        </Block>
      )}

      {(state === "NOTIFIED" || state === "REVIEW_PENDING" || state === "ACTION_REQUESTED") && (
        <Block n="04" title="Record an action decision">
          {role === "analyst" ? (
            <p className="text-xs text-signal">
              Your role cannot record an action. A supervisor or compliance officer must do this.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={label}>
                  Standing rule / legal power
                  <input value={authority} onChange={(e) => setAuthority(e.target.value)} className={field} placeholder="CPRegs 2022 / PND / lien" />
                </label>
                <label className={label}>
                  Rule ID (optional)
                  <input value={rule} onChange={(e) => setRule(e.target.value)} className={field} placeholder="RULE-T1" />
                </label>
              </div>
              <label className={`${label} mt-3`}>
                Rationale
                <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} className={field} rows={2} />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                {(["ACCEPTED", "DECLINED", "NOT_PERMITTED"] as const).map((d) => (
                  <button
                    key={d}
                    disabled={role === "analyst" || busy !== null || !authority.trim() || !rationale.trim()}
                    onClick={() =>
                      send(
                        "action",
                        {
                          type: d === "NOT_PERMITTED" ? "CORRECTION" : "HOLD_REQUEST",
                          decision: d,
                          authorityRef: authority,
                          standingRuleId: rule || null,
                          rationale,
                        },
                        `Action ${d.toLowerCase()}`,
                      )
                    }
                    className={`rounded-full border px-4 py-2 font-mono text-[0.6875rem] transition-colors disabled:opacity-40 ${
                      d === "ACCEPTED"
                        ? "border-guard/40 text-guard hover:bg-guard-deep/40"
                        : d === "DECLINED"
                          ? "border-line-strong text-muted hover:text-ink"
                          : "border-critical/40 text-critical hover:bg-critical-deep/40"
                    }`}
                  >
                    {d.replaceAll("_", " ")}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[0.7rem] leading-relaxed text-faint">
                An authority reference is mandatory. The case cannot advance without one.
              </p>
            </>
          )}
        </Block>
      )}

      {["ACTION_ACCEPTED", "ACTION_DECLINED", "ACTION_NOT_PERMITTED", "INVESTIGATION", "RECIPIENT_CHALLENGE"].includes(state) && (
        <Block n="05" title="Recipient challenge control">
          {!challenge ? (
            <>
              <label className={label}>
                Defer recipient notice (0–72 hours)
                <input
                  type="number"
                  min={0}
                  max={72}
                  step={1}
                  value={deferHours}
                  onChange={(e) => setDeferHours(e.target.value)}
                  className={field}
                  inputMode="numeric"
                />
              </label>
              <label className={`${label} mt-3`}>
                Note (optional)
                <textarea value={challengeNote} onChange={(e) => setChallengeNote(e.target.value)} className={field} rows={2} />
              </label>
              <button
                disabled={
                  role === "analyst" ||
                  busy !== null ||
                  !Number.isInteger(deferralHours) ||
                  deferralHours < 0 ||
                  deferralHours > 72 ||
                  !["ACTION_ACCEPTED", "ACTION_DECLINED", "ACTION_NOT_PERMITTED", "INVESTIGATION"].includes(state) ||
                  blocked
                }
                onClick={() =>
                  send("challenge", { deferHours: deferralHours, note: challengeNote }, "Challenge")
                }
                className={btn(busy)}
              >
                Open challenge with this deferral
              </button>
              <p className="mt-3 text-[0.7rem] leading-relaxed text-faint">
                The chosen period is recorded. 0 means the recipient is not deferred; that choice is audited too.
                {blocked && " Unsafe contact is blocking this step."}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs leading-relaxed text-muted">
                Challenge is {challenge.status.toLowerCase()}. Deferred until{" "}
                <span className="font-mono text-ink">{challenge.deferredUntil ?? "no deferral (0 hours)"}</span>.
              </p>
              {challenge.status === "OPEN" ? (
                <>
                  <label className={`${label} mt-4`}>
                    Reason for release (recorded with your identity)
                    <textarea value={releaseReason} onChange={(e) => setReleaseReason(e.target.value)} className={field} rows={2} />
                  </label>
                  <label className="mt-3 flex items-start gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={earlyRelease}
                      onChange={(e) => setEarlyRelease(e.target.checked)}
                      className="mt-0.5 accent-[var(--color-guard)]"
                    />
                    Confirm release before the deferred-until time
                  </label>
                  <button
                    disabled={role === "analyst" || busy !== null || !releaseReason.trim() || blocked}
                    onClick={() =>
                      send("release", { reason: releaseReason, earlyRelease }, "Challenge release")
                    }
                    className={btn(busy)}
                  >
                    Release challenge with reason
                  </button>
                  {blocked && (
                    <p className="mt-3 border-l-2 border-critical pl-3 text-xs text-critical">
                      Unsafe contact blocks release until a supervisor records an override.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-3 text-xs text-faint">
                  Released by {challenge.releasedBy ?? "unrecorded"} at {challenge.releasedAt ?? "unrecorded"}.
                  Reason: {challenge.resolutionNote ?? "unrecorded"}.
                </p>
              )}
            </>
          )}
        </Block>
      )}

      <Block n="06" title="Handover note">
        <label className={label}>
          Note
          <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} className={field} rows={3} placeholder="What the next officer must know" />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={label}>
            Reason code
            <input value={noteReason} onChange={(e) => setNoteReason(e.target.value)} className={field} placeholder="SAFETY_HANDOVER" />
          </label>
          <label className={label}>
            Type
            <select value={noteType} onChange={(e) => setNoteType(e.target.value)} className={field}>
              {["HANDOVER", "SAFETY", "CONTEXT"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          disabled={role === "analyst" || busy !== null || !noteBody.trim() || !noteReason.trim()}
          onClick={() =>
            send("add_note", { body: noteBody, reasonCode: noteReason, type: noteType }, "Handover note")
          }
          className={btn(busy)}
        >
          Record handover note
        </button>
        <p className="mt-3 text-[0.7rem] leading-relaxed text-faint">
          Notes are append-only and attributed to you in the audit trail.
        </p>
      </Block>

      {!["CLOSED", "REJECTED"].includes(state) && (
        <Block n="07" title="Close the case">
          <label className={label}>
            Reason
            <input value={closeReason} onChange={(e) => setCloseReason(e.target.value)} className={field} placeholder="Customer confirmed safe" />
          </label>
          <button
            disabled={role === "analyst" || busy !== null || !closeReason.trim()}
            onClick={() => send("close", { reason: closeReason }, "Closure")}
            className={btn(busy)}
          >
            Close and delete incident detail
          </button>
          <p className="mt-3 text-[0.7rem] leading-relaxed text-faint">
            Closure destroys the incident narrative. Only the audit trail — actions, not the
            account of coercion — is retained.
          </p>
        </Block>
      )}

      <Block n="08" title="Assign">
        <label className={label}>
          Analyst
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={field}>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.role}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={role === "analyst" || busy !== null || !assignee}
          onClick={() => send("assign", { assigneeId: assignee }, "Assignment")}
          className={btn(busy)}
        >
          Assign case
        </button>
      </Block>
    </div>
  );
}

function btn(busy: string | null) {
  return `mt-4 rounded-full border border-line-strong px-4 py-2 text-xs text-ink transition-colors hover:border-guard/50 hover:text-guard disabled:opacity-40 ${busy ? "opacity-50" : ""}`;
}

function Block({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5">
      <div className="mb-4 flex items-baseline gap-3">
        <span className="font-mono text-[0.6875rem] text-guard">{n}</span>
        <h3 className="text-sm text-ink">{title}</h3>
      </div>
      {children}
    </section>
  );
}
