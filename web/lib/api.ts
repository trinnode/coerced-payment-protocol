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
  const message = e instanceof Error ? e.message : "Unexpected error";
  const code = message === "E_FORBIDDEN" ? "E_FORBIDDEN" : "E_UNAVAILABLE";
  return NextResponse.json(
    { error: { code, message } },
    { status: ERROR_HTTP[code] ?? 500 },
  );
}
