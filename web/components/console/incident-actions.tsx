"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; name: string; role?: string };

export function IncidentActions({
  id,
  state,
  correlation,
  institutions,
  staff,
  role,
}: {
  id: string;
  state: string;
  correlation: string;
  institutions: Option[];
  staff: Option[];
  role: string;
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
      {message && (
        <p
          role="status"
          className={`border-l-2 pl-3 text-xs ${message.bad ? "border-critical text-critical" : "border-guard text-guard"}`}
        >
          {message.text}
        </p>
      )}

      {correlation === "PENDING" && (
        <Block n="01" title="Correlate a transfer">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              Result
              <select
                value={corrStatus}
                onChange={(e) => setCorrStatus(e.target.value)}
                className={field}
              >
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
            disabled={busy !== null || (corrStatus === "CORRELATED" && (!txnRef || !txnAmount))}
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
        </Block>
      )}

      {(state === "CORRELATED" || state === "REVIEW_PENDING") && (
        <Block n="02" title="Notify the receiving institution">
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
            disabled={busy !== null || !receiving}
            onClick={() => send("notify", { receivingInstitutionId: receiving }, "Notification")}
            className={btn(busy)}
          >
            Send signed notice
          </button>
          <p className="mt-3 text-[0.7rem] leading-relaxed text-faint">
            This produces a fast human referral. It does not place a hold.
          </p>
        </Block>
      )}

      {(state === "NOTIFIED" || state === "REVIEW_PENDING" || state === "ACTION_REQUESTED") && (
        <Block n="03" title="Record an action decision">
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
                  <input value={rule} onChange={(e) => setRule(e.target.value)} className={field} placeholder="RULE-HOLD-T1" />
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
                    disabled={busy !== null || !authority.trim() || !rationale.trim()}
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

      {["ACTION_ACCEPTED", "ACTION_DECLINED", "ACTION_NOT_PERMITTED", "INVESTIGATION"].includes(state) && (
        <Block n="04" title="Open a recipient challenge">
          <button
            disabled={busy !== null}
            onClick={() =>
              send(
                "challenge",
                { deferHours: 6, note: "Recipient notice deferred pending victim-safety review." },
                "Challenge",
              )
            }
            className={btn(busy)}
          >
            Open deferred challenge
          </button>
          <p className="mt-3 text-[0.7rem] leading-relaxed text-faint">
            Notifies the receiving institution, not the recipient. Contact is deferred six hours
            and can be extended while the sender may be at risk.
          </p>
        </Block>
      )}

      {!["CLOSED", "REJECTED"].includes(state) && (
        <Block n="05" title="Close the case">
          <label className={label}>
            Reason
            <input value={closeReason} onChange={(e) => setCloseReason(e.target.value)} className={field} placeholder="Customer confirmed safe" />
          </label>
          <button
            disabled={busy !== null || !closeReason.trim()}
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

      <Block n="06" title="Assign">
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
          disabled={busy !== null || !assignee}
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
