import { NextResponse } from "next/server";
import { fail, withSession } from "@/lib/api";
import {
  assignIncident,
  closeIncident,
  correlate,
  decideAction,
  notifyReceiving,
  openChallenge,
} from "@/lib/domain/incidents";

export const runtime = "nodejs";

type Body = Record<string, unknown>;

async function parse(request: Request): Promise<Body> {
  try {
    return (await request.json()) as Body;
  } catch {
    throw new Error("Invalid JSON");
  }
}

const str = (v: unknown, field: string): string => {
  if (typeof v !== "string" || !v.trim()) throw new Error(`${field} is required`);
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
            throw new Error("Invalid correlation status");
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
                    amountMinor: Number(txn.amountMinor),
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
          return NextResponse.json(
            await notifyReceiving({
              ...base,
              receivingInstitutionId: str(body.receivingInstitutionId, "receivingInstitutionId"),
              note: typeof body.note === "string" ? body.note : undefined,
            }),
          );

        case "action": {
          if (session.role === "analyst") return fail(new Error("E_FORBIDDEN"));
          return NextResponse.json(
            await decideAction({
              ...base,
              type: str(body.type, "type") as never,
              decision: str(body.decision, "decision") as never,
              authorityRef: str(body.authorityRef, "authorityRef"),
              rationale: str(body.rationale, "rationale"),
              standingRuleId:
                typeof body.standingRuleId === "string" ? body.standingRuleId : null,
            }),
          );
        }

        case "challenge":
          return NextResponse.json(
            await openChallenge({
              ...base,
              note: typeof body.note === "string" ? body.note : undefined,
              deferHours: typeof body.deferHours === "number" ? body.deferHours : undefined,
            }),
          );

        case "close":
          return NextResponse.json(await closeIncident({ ...base, reason: str(body.reason, "reason") }));

        case "assign":
          return NextResponse.json(
            await assignIncident({ ...base, assigneeId: str(body.assigneeId, "assigneeId") }),
          );

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
