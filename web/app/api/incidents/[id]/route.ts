import { NextResponse } from "next/server";
import { fail, withSession } from "@/lib/api";
import { requireRole } from "@/lib/auth/session";
import { DomainError } from "@/lib/domain/incidents";
import {
  assignIncident,
  closeIncident,
  correlate,
  decideAction,
  notifyReceiving,
  openChallenge,
  releaseChallenge,
  addCaseNote,
  setContactState,
} from "@/lib/domain/incidents";

export const runtime = "nodejs";

type Body = Record<string, unknown>;

async function parse(request: Request): Promise<Body> {
  try {
    return (await request.json()) as Body;
  } catch {
    throw new DomainError("E_SCHEMA", "Request body is not valid JSON");
  }
}

const amountMinor = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isSafeInteger(n) || n <= 0 || n > 100_000_000_000) {
    throw new DomainError("E_SCHEMA", "amountMinor must be a positive integer");
  }
  return n;
};

const str = (v: unknown, field: string): string => {
  if (typeof v !== "string" || !v.trim()) throw new DomainError("E_SCHEMA", `${field} is required`);
  return v.trim();
};

/** All incident mutations go through one route. The `intent` picks the domain
 *  operation; role checks and authority guards live in the domain layer. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withSession(async (session) => {
    try {
      const { id } = await ctx.params;
      const body = await parse(request);
      const intent = str(body.intent, "intent");
      // Hiding controls in the UI is not access control. Every case mutation
      // requires a supervisor-level role at the API boundary.
      try {
        await requireRole("supervisor");
      } catch {
        throw new DomainError("E_FORBIDDEN", "Supervisor or compliance role required");
      }
      const actorLabel = `${session.role}:${session.email}`;
      const base = {
        incidentId: id,
        institutionId: session.institutionId,
        actorLabel,
        actorId: session.userId,
      };

      switch (intent) {
        case "correlate": {
          const status = str(body.status, "status") as "CORRELATED" | "NOT_CORRELATED" | "UNKNOWN";
          if (!["CORRELATED", "NOT_CORRELATED", "UNKNOWN"].includes(status)) {
            throw new DomainError("E_SCHEMA", "Invalid correlation status");
          }
          const txn = body.transaction as Record<string, unknown> | undefined;
          return NextResponse.json(
            await correlate({
              ...base,
              status,
              note: typeof body.note === "string" ? body.note : undefined,
              transaction: txn
                ? {
                    ref: str(txn.ref, "transaction.ref"),
                    status: str(txn.status, "transaction.status") as never,
                    amountMinor: amountMinor(txn.amountMinor),
                    beneficiaryInstitutionId:
                      typeof txn.beneficiaryInstitutionId === "string"
                        ? txn.beneficiaryInstitutionId
                        : null,
                    beneficiaryToken:
                      typeof txn.beneficiaryToken === "string" ? txn.beneficiaryToken : null,
                  }
                : undefined,
            }),
          );
        }

        case "notify":
          await notifyReceiving({
            ...base,
            receivingInstitutionId: str(body.receivingInstitutionId, "receivingInstitutionId"),
            note: typeof body.note === "string" ? body.note : undefined,
          });
          return NextResponse.json({ ok: true });

        case "set_contact": {
          const state = str(body.state, "state") as "SAFE" | "UNSAFE" | "UNKNOWN";
          if (!["SAFE", "UNSAFE", "UNKNOWN"].includes(state)) {
            throw new DomainError("E_SCHEMA", "Invalid contact state");
          }
          return NextResponse.json(
            await setContactState({
              ...base,
              actorRole: session.role,
              state,
              reason: str(body.reason, "reason"),
              override: body.override === true,
            }),
          );
        }

        case "add_note":
          return NextResponse.json(
            await addCaseNote({
              ...base,
              body: str(body.body, "body"),
              reasonCode: str(body.reasonCode, "reasonCode"),
              type: typeof body.type === "string" ? body.type : undefined,
            }),
          );

        case "action": {
          if (session.role === "analyst") return fail(new Error("E_FORBIDDEN"));
          await decideAction({
            ...base,
            type: str(body.type, "type") as never,
            decision: str(body.decision, "decision") as never,
            authorityRef: str(body.authorityRef, "authorityRef"),
            rationale: str(body.rationale, "rationale"),
            standingRuleId:
              typeof body.standingRuleId === "string" ? body.standingRuleId : null,
          });
          return NextResponse.json({ ok: true });
        }

        case "challenge": {
          if (
            typeof body.deferHours !== "number" ||
            !Number.isInteger(body.deferHours) ||
            body.deferHours < 0 ||
            body.deferHours > 72
          ) {
            throw new DomainError("E_SCHEMA", "deferHours must be an integer from 0 to 72");
          }
          await openChallenge({
            ...base,
            note: typeof body.note === "string" ? body.note : undefined,
            deferHours: body.deferHours,
          });
          return NextResponse.json({ ok: true });
        }

        case "release":
          await releaseChallenge({
            ...base,
            reason: str(body.reason, "reason"),
            earlyRelease: body.earlyRelease === true,
          });
          return NextResponse.json({ ok: true });

        case "close":
          await closeIncident({ ...base, reason: str(body.reason, "reason") });
          return NextResponse.json({ ok: true });

        case "assign":
          await assignIncident({ ...base, assigneeId: str(body.assigneeId, "assigneeId") });
          return NextResponse.json({ ok: true });

        default:
          return NextResponse.json(
            { error: { code: "E_SCHEMA", message: `Unknown intent: ${intent}` } },
            { status: 400 },
          );
      }
    } catch (e) {
      return fail(e);
    }
  });
}
