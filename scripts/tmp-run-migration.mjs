import { Pool } from "pg";
import { readFileSync } from "fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 20000 });
try {
  const client = await pool.connect();
  console.log("Connected OK");
  const sql = readFileSync("drizzle/0024_aberrant_moonstone.sql", "utf8");
  const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);
  for (const [i, stmt] of statements.entries()) {
    try {
      await client.query(stmt);
      console.log(`Statement ${i + 1}/${statements.length} OK`);
    } catch (err) {
      console.log(`Statement ${i + 1} FAILED:`, err.message, err.code);
    }
  }
  client.release();
} catch (err) {
  console.log("Connection FAILED. code=", err.code, "message=", err.message);
} finally {
  await pool.end();
}
