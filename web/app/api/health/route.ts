import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};
  let ok = true;

  try {
    const { sql } = await import("@/lib/db/client");
    await sql`select 1`;
    checks.database = "up";
  } catch {
    checks.database = "down";
    ok = false;
  }

  checks.auth = process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16 ? "configured" : "missing";
  if (checks.auth === "missing") ok = false;

  return NextResponse.json(
    { ok, service: "phylax-web", checks, time: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}
