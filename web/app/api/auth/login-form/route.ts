import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db/client";
import { institutions, users } from "@/lib/db/schema";

export const runtime = "nodejs";

/**
 * Native form endpoint. The console sign-in works before JavaScript hydrates —
 * there is no client-side gate between a person and their case queue.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const back = new URL("/console/login?error=invalid", request.url);

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
  // Equal work for an unknown address so the response time is not an oracle.
  const valid = row
    ? await verifyPassword(password, row.user.passwordHash)
    : await verifyPassword(password, "$scrypt$00$00");

  if (!row || !valid || !row.user.active) {
    return NextResponse.redirect(back, { status: 303 });
  }

  await createSession({
    userId: row.user.id,
    institutionId: row.user.institutionId,
    institutionName: row.institution.name,
    name: row.user.name,
    email: row.user.email,
    role: row.user.role,
    version: row.user.sessionVersion,
  });

  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, row.user.id));

  return NextResponse.redirect(new URL("/console", request.url), { status: 303 });
}
