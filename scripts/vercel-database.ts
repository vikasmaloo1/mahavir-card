import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

type Journal = {
  entries: Array<{ tag: string; when: number }>;
};

function directDatabaseUrl() {
  const explicit = process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL_NON_POOLING;
  if (explicit) return explicit;

  const applicationUrl = process.env.DATABASE_URL;
  if (!applicationUrl) return null;
  try {
    return new URL(applicationUrl).hostname.includes("-pooler.") ? null : applicationUrl;
  } catch {
    return null;
  }
}

async function appliedMigrationTimes(connectionString: string) {
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
  });
  try {
    await client.connect();
    const result = await client.query<{ created_at: string }>(
      "select created_at from drizzle.__drizzle_migrations order by created_at",
    );
    return new Set(result.rows.map((row) => Number(row.created_at)));
  } catch (error) {
    if (["42P01", "3F000"].includes((error as { code?: string }).code ?? "")) return new Set<number>();
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main() {
  const checkOnly = process.argv.includes("--check-only");
  const journal = JSON.parse(
    await readFile(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"),
  ) as Journal;
  const readUrl = process.env.DATABASE_URL_UNPOOLED
    ?? process.env.POSTGRES_URL_NON_POOLING
    ?? process.env.DATABASE_URL;
  if (!readUrl) throw new Error("DATABASE_URL is required for the Vercel database preflight");

  const applied = await appliedMigrationTimes(readUrl);
  const pending = journal.entries.filter((entry) => !applied.has(entry.when));
  if (!pending.length) {
    console.log("Database migrations are current; skipping drizzle-kit migrate.");
    return;
  }

  if (checkOnly) {
    throw new Error("Pending database migrations: " + pending.map((entry) => entry.tag).join(", "));
  }

  const migrationUrl = directDatabaseUrl();
  if (!migrationUrl) {
    throw new Error(
      "Pending migrations require DATABASE_URL_UNPOOLED in Vercel. Add the direct Neon URL for Production and Preview deployments.",
    );
  }

  console.log("Applying pending database migrations: " + pending.map((entry) => entry.tag).join(", "));
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCommand, ["run", "db:migrate"], {
    env: { ...process.env, DATABASE_URL_UNPOOLED: migrationUrl },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("drizzle-kit migrate failed with exit code " + result.status);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
