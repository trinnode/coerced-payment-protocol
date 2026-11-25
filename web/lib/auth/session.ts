import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";
import { DomainError } from "../domain/errors";

export const SESSION_COOKIE = "phylax_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

export type Role = "analyst" | "supervisor" | "compliance";

export type Session = {
  userId: string;
  version: number;
  institutionId: string;
  institutionName: string;
  name: string;
  email: string;
  role: Role;
  exp: number;
};

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET missing or too short");
  return s;
}

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromB64url = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

export function signSession(session: Session): string {
  const body = b64url(JSON.stringify(session));
  const mac = b64url(createHmac("sha256", secret()).update(body).digest());
  return `${body}.${mac}`;
}

/** Signature and expiry only. Never trust the claims without `getSession`. */
export function verifySession(token: string | undefined): Session | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret()).update(body).digest();
  const given = fromB64url(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const parsed = JSON.parse(fromB64url(body).toString("utf8")) as Session;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof parsed.version !== "number" || !parsed.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function createSession(
  session: Omit<Session, "exp" | "version"> & { version?: number },
): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSession({ ...session, version: session.version ?? 0, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Invalidate every session for a user. Called on logout and on role changes. */
export async function revokeUserSessions(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, userId));
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const signed = jar.get(SESSION_COOKIE)?.value;
  const parsed = verifySession(signed);
  if (parsed) await revokeUserSessions(parsed.userId);
  jar.delete(SESSION_COOKIE);
}

/**
 * The authoritative session check. Roles, tenant and identity are read from
 * the database on every request, so logout, demotion and deactivation take
 * effect immediately instead of waiting for cookie expiry.
 */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const signed = verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!signed) return null;

  const rows = await db
    .select({
      id: users.id,
      institutionId: users.institutionId,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
      sessionVersion: users.sessionVersion,
    })
    .from(users)
    .where(eq(users.id, signed.userId))
    .limit(1);

  const row = rows[0];
  if (!row || !row.active || row.sessionVersion !== signed.version) return null;

  // Re-read from the DB so a stale or forged cookie claim cannot elevate a role.
  return {
    userId: row.id,
    version: row.sessionVersion,
    institutionId: row.institutionId,
    institutionName: signed.institutionName,
    name: row.name,
    email: row.email,
    role: row.role as Role,
    exp: signed.exp,
  };
}

const RANK: Record<Role, number> = { analyst: 1, supervisor: 2, compliance: 3 };

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new DomainError("E_UNAUTHENTICATED", "Sign in required");
  return s;
}

export async function requireRole(min: Role): Promise<Session> {
  const s = await requireSession();
  if (RANK[s.role] < RANK[min]) throw new DomainError("E_FORBIDDEN", "Insufficient role for this action");
  return s;
}

export function atLeast(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}
