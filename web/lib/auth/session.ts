import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "phylax_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

export type Role = "analyst" | "supervisor" | "compliance";

export type Session = {
  userId: string;
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
    return parsed;
  } catch {
    return null;
  }
}

export async function createSession(session: Omit<Session, "exp">): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSession({ ...session, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

const RANK: Record<Role, number> = { analyst: 1, supervisor: 2, compliance: 3 };

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Error("E_UNAUTHENTICATED");
  return s;
}

export async function requireRole(min: Role): Promise<Session> {
  const s = await requireSession();
  if (RANK[s.role] < RANK[min]) throw new Error("E_FORBIDDEN");
  return s;
}

export function atLeast(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}
