import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/server/env";
import * as schema from "./schema";

let cached: ReturnType<typeof create> | undefined;

function create() {
  const sql = postgres(getEnv().DATABASE_URL);
  return drizzle(sql, { schema });
}

export function getDb() {
  return (cached ??= create());
}

export type Db = ReturnType<typeof getDb>;
