import "server-only";
import postgres from "postgres";

declare global {
  // Reuse one pool across hot reloads in dev and warm serverless invocations.
  var __aipeSql: postgres.Sql | undefined;
}

/** Shared Postgres client. Created on first use so builds don't need DATABASE_URL. */
export function db(): postgres.Sql {
  if (!globalThis.__aipeSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    // prepare:false keeps it compatible with Neon/Supabase poolers (transaction mode).
    globalThis.__aipeSql = postgres(url, { prepare: false, max: 5, onnotice: () => {} });
  }
  return globalThis.__aipeSql;
}
