import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  mahavirPool?: Pool;
};

const pool =
  globalForDb.mahavirPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });

// Cache on globalThis in every environment, not just dev: this pool is shared
// with Better Auth (see src/lib/auth.ts). Without this, a warm serverless
// container that re-evaluates this module (e.g. via a bundler re-require)
// could open a second 10-connection pool on top of the first, and combined
// with Better Auth previously opening its own separate pool, concurrent
// requests could exhaust Neon's connection limit and surface as pages
// failing to load.
globalForDb.mahavirPool = pool;

export const db = drizzle(pool, { schema });
export { pool };
