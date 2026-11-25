import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { institutions, users } from "../db/schema";
import { verifyPassword } from "./password";

export type AuthenticatedUser = {
  user: typeof users.$inferSelect;
  institutionName: string;
};

/**
 * The single credential-verification path for both the JSON API and the native
 * form endpoint. Unknown addresses do the same scrypt work as real ones so the
 * response time is not an enumeration oracle.
 */
export async function authenticate(email: string, password: string): Promise<AuthenticatedUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) return null;

  const rows = await db
    .select({
      user: users,
      institution: { id: institutions.id, name: institutions.shortName },
    })
    .from(users)
    .innerJoin(institutions, eq(users.institutionId, institutions.id))
    .where(eq(users.email, normalized))
    .limit(1);

  const row = rows[0];
  const valid = row
    ? await verifyPassword(password, row.user.passwordHash)
    : await verifyPassword(password, "$scrypt$00$00");

  if (!row || !valid || !row.user.active) return null;
  return { user: row.user, institutionName: row.institution.name };
}
