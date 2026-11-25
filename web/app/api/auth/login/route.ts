import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/authenticate";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let email = "";
  let password = "";
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    email = body.email ?? "";
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: { code: "E_SCHEMA", message: "Invalid JSON" } }, { status: 400 });
  }

  const found = await authenticate(email, password);
  if (!found) {
    return NextResponse.json(
      { error: { code: "E_UNAUTHENTICATED", message: "Invalid credentials" } },
      { status: 401 },
    );
  }

  await createSession({
    userId: found.user.id,
    institutionId: found.user.institutionId,
    institutionName: found.institutionName,
    name: found.user.name,
    email: found.user.email,
    role: found.user.role,
    version: found.user.sessionVersion,
  });
  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, found.user.id));

  return NextResponse.json({ ok: true, redirect: "/console" });
}
