import { sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";

export async function checkDatabase(db: Db): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
