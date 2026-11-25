import { NextResponse } from "next/server";
import { getSession, type Session } from "./auth/session";
import { DomainError } from "./domain/incidents";
import { ERROR_HTTP } from "./domain/event";

export async function withSession(
  handler: (session: Session) => Promise<NextResponse>,
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: { code: "E_UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  return handler(session);
}

export function fail(e: unknown): NextResponse {
  if (e instanceof DomainError) {
    return NextResponse.json(
      { error: { code: e.code, message: e.message } },
      { status: ERROR_HTTP[e.code] ?? 400 },
    );
  }
  // Never disclose driver errors, SQL or bound parameters to a caller.
  const correlationId = crypto.randomUUID();
  console.error(`[api-error] ${correlationId}`, e instanceof Error ? e.message : "unknown");
  return NextResponse.json(
    {
      error: {
        code: "E_UNAVAILABLE",
        message: "The request could not be completed.",
        correlation_id: correlationId,
      },
    },
    { status: 500 },
  );
}
