import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/authenticate";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

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
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const back = new URL("/console/login?error=invalid", request.url);

  const found = await authenticate(email, password);
  if (!found) return NextResponse.redirect(back, { status: 303 });

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

  return NextResponse.redirect(new URL("/console", request.url), { status: 303 });
}
