import { getEnv } from "@/server/env";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Invalid settings fail at start, on Vercel too.
  getEnv();
  // On Vercel migrations run in the build (H2), never on server start.
  if (process.env.VERCEL) return;
  const { runMigrations } = await import("@/server/db/migrate");
  await runMigrations();
}
