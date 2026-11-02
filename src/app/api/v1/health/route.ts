import { getDb } from "@/server/db/client";
import { checkDatabase } from "@/server/health";
import { errorResponse } from "@/server/http/errors";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const ok = await checkDatabase(getDb());
  if (!ok) {
    return errorResponse(
      503,
      "database_unavailable",
      "The database is not reachable right now. Please try again in a moment.",
    );
  }
  return Response.json({ status: "ok", checks: { database: "ok" } });
}
