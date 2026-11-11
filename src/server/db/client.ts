import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/server/env";
import * as schema from "./schema";

let cached: ReturnType<typeof create> | undefined;

/**
 * On Vercel every function instance holds at most one connection (H1), so many
 * instances do not exhaust the pooled database. Elsewhere keep the driver default.
 */
export function clientOptions(env: Record<string, string | undefined> = process.env) {
  return env.VERCEL ? { max: 1 } : {};
}

function create() {
  const sql = postgres(getEnv().DATABASE_URL, clientOptions());
  return drizzle(sql, { schema });
}

export function getDb() {
  return (cached ??= create());
}

export type Db = ReturnType<typeof getDb>;
