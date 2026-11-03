import { Pool } from "pg";

let pool: Pool | null = null;

export function centralPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 5,
      ssl: process.env.DATABASE_SSL === "false" ? false : undefined,
    });
  }
  return pool;
}
