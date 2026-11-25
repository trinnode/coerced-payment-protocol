import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const globalForDb = globalThis as unknown as {
  __phylaxSql?: ReturnType<typeof postgres>;
};

const sql =
  globalForDb.__phylaxSql ??
  postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // Required for transaction-mode poolers; harmless locally.
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__phylaxSql = sql;

export const db = drizzle(sql, { schema });
export { sql };
