import pg from "pg";

const { Pool } = pg;

// A Pool (not a single Client) cached on the global object so warm
// serverless invocations reuse it instead of opening a new connection per
// request. Pairs with Neon's pooled (PgBouncer) connection string, which
// tolerates many short-lived serverless-style connections.
const globalCache = globalThis;
if (!globalCache._pgPool) {
  globalCache._pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
}

export const pool = globalCache._pgPool;

export function query(text, params) {
  return pool.query(text, params);
}
