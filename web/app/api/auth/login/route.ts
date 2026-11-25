import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db/client";
import { institutions, users } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let email = "";
  let password = "";
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    email = (body.email ?? "").trim().toLowerCase();
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: { code: "E_SCHEMA", message: "Invalid JSON" } }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: { code: "E_SCHEMA", message: "Email and password required" } },
      { status: 400 },
    );
  }

  const rows = await db
    .select({
      user: users,
      institution: { id: institutions.id, name: institutions.shortName },
    })
    .from(users)
    .innerJoin(institutions, eq(users.institutionId, institutions.id))
    .where(eq(users.email, email))
    .limit(1);

  const row = rows[0];
  // Verify against a fixed dummy hash when the user does not exist, so the
  // response time does not disclose which addresses are enrolled.
  const valid = row
    ? await verifyPassword(password, row.user.passwordHash)
    : await verifyPassword(password, "$scrypt$00$00");

  if (!row || !valid || !row.user.active) {
    return NextResponse.json(
      { error: { code: "E_UNAUTHENTICATED", message: "Invalid credentials" } },
      { status: 401 },
    );
  }

  await createSession({
    userId: row.user.id,
    institutionId: row.user.institutionId,
    institutionName: row.institution.name,
    name: row.user.name,
    email: row.user.email,
    role: row.user.role,
  });

  await db
    .update(users)
    .set({ lastSeenAt: new Date() })
    .where(eq(users.id, row.user.id));

  return NextResponse.json({ ok: true, redirect: "/console" });
}
