export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // On Vercel migrations run in the build (H2), never on server start.
  if (process.env.VERCEL) return;
  const { runMigrations } = await import("@/server/db/migrate");
  await runMigrations();
}
