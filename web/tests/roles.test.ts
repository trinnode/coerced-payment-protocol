import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Role and error-mapping checks at unit level. The cookie jar and the users
 * lookup are stubbed so requireSession / requireRole can be exercised without a
 * live HTTP request; the HTTP status mapping is the real one used by fail().
 */
const h = vi.hoisted(() => ({
  token: undefined as string | undefined,
  user: null as Record<string, unknown> | null,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "phylax_session" && h.token ? { name, value: h.token } : undefined,
    set: () => {},
    delete: () => {},
  }),
}));

vi.mock("@/lib/db/client", () => {
  const selection = {
    from: () => ({
      where: () => ({
        limit: async () => (h.user ? [h.user] : []),
      }),
    }),
  };
  return {
    db: {
      select: () => selection,
      update: () => ({ set: () => ({ where: async () => [] }) }),
    },
    sql: () => "",
  };
});

import { fail } from "@/lib/api";
import {
  atLeast,
  getSession,
  requireRole,
  requireSession,
  signSession,
  SESSION_COOKIE,
  verifySession as verifySessionLocal,
  type Role,
} from "@/lib/auth/session";
import { DomainError, StateTransitionError } from "@/lib/domain/errors";
import { ERROR_HTTP } from "@/lib/domain/event";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const INSTITUTION_ID = "bank_kite";

function setUser(role: Role, version = 0, active = true) {
  h.user = {
    id: USER_ID,
    institutionId: INSTITUTION_ID,
    name: "Role test",
    email: `roles.${role}@kite.example.ng`,
    role,
    active,
    sessionVersion: version,
  };
}

function setCookie(claims: Partial<Parameters<typeof signSession>[0]> = {}) {
  h.token = signSession({
    userId: USER_ID,
    version: 0,
    institutionId: INSTITUTION_ID,
    institutionName: "Kite Bank",
    name: "Role test",
    email: "roles@test.example",
    role: "supervisor", // deliberately claims more authority than the DB row
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...claims,
  });
}

async function caught(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn();
  } catch (e) {
    return e;
  }
  throw new Error("Expected the call to reject");
}

describe("role hierarchy", () => {
  beforeEach(() => {
    h.token = undefined;
    h.user = null;
  });

  it("ranks analyst below supervisor below compliance", () => {
    expect(atLeast("analyst", "analyst")).toBe(true);
    expect(atLeast("supervisor", "analyst")).toBe(true);
    expect(atLeast("compliance", "supervisor")).toBe(true);
    expect(atLeast("analyst", "supervisor")).toBe(false);
    expect(atLeast("supervisor", "compliance")).toBe(false);
  });

  it("requires a session and reports E_UNAUTHENTICATED when there is none", async () => {
    const err = await caught(() => requireSession());
    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({ code: "E_UNAUTHENTICATED" });
    expect(fail(err).status).toBe(401);
    expect(await getSession()).toBeNull();
  });

  it("accepts supervisor and compliance for requireRole('supervisor')", async () => {
    for (const role of ["supervisor", "compliance"] as const) {
      setUser(role);
      setCookie({ role: "analyst" }); // the claim is deliberately wrong
      const session = await requireRole("supervisor");
      expect(session.role).toBe(role); // authority is re-read from the database
    }
  });

  it("rejects an analyst with E_FORBIDDEN for every case mutation", async () => {
    setUser("analyst");
    setCookie({ role: "compliance" }); // a forged claim must not elevate
    const err = await caught(() => requireRole("supervisor"));
    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({ code: "E_FORBIDDEN" });
    // DomainError, not a plain Error: fail() therefore returns the real 403.
    expect(fail(err).status).toBe(403);
    expect((await getSession())?.role).toBe("analyst");
  });

  it("ignores a stale sessionVersion", async () => {
    setUser("supervisor", 3);
    setCookie({ version: 2 });
    expect(await getSession()).toBeNull();
    const err = await caught(() => requireRole("supervisor"));
    expect(err).toMatchObject({ code: "E_UNAUTHENTICATED" });
    expect(fail(err).status).toBe(401);
  });

  it("ignores an inactive user", async () => {
    setUser("supervisor", 0, false);
    setCookie({ version: 0 });
    expect(await getSession()).toBeNull();
  });

  it("rejects a tampered or expired cookie before touching the database", () => {
    setUser("supervisor");
    setCookie();
    const [body, mac] = h.token!.split(".");
    expect(verifySessionLocal(`${body}.${"a".repeat(mac.length)}`)).toBeNull();
    expect(verifySessionLocal(`${body}.${mac}`)).not.toBeNull();
    setCookie({ exp: Math.floor(Date.now() / 1000) - 1 });
    expect(verifySessionLocal(h.token)).toBeNull();
    expect(SESSION_COOKIE).toBe("phylax_session");
  });
});

describe("DomainError to HTTP status mapping", () => {
  it("maps the authoritative codes used by fail()", () => {
    expect(ERROR_HTTP.E_FORBIDDEN).toBe(403);
    expect(ERROR_HTTP.E_INVALID_TRANSITION).toBe(409);
    expect(ERROR_HTTP.E_STATE_GUARD).toBe(409);
    expect(ERROR_HTTP.E_NOT_FOUND).toBe(404);
    expect(ERROR_HTTP.E_UNAUTHENTICATED).toBe(401);
  });

  it("returns those statuses for real DomainErrors", () => {
    expect(fail(new DomainError("E_FORBIDDEN", "denied")).status).toBe(403);
    expect(fail(new DomainError("E_INVALID_TRANSITION", "illegal")).status).toBe(409);
    expect(fail(new DomainError("E_STATE_GUARD", "guard")).status).toBe(409);
    expect(fail(new DomainError("E_NOT_FOUND", "missing")).status).toBe(404);
    expect(fail(new StateTransitionError("RECEIVED", "CLOSED")).status).toBe(409);
  });

  it("never maps an unknown code to a privileged-looking status", () => {
    expect(fail(new DomainError("E_MADE_UP", "x")).status).toBe(400);
  });
});
