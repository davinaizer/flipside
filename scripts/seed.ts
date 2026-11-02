import { getDb } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { seedProfiles } from "@/server/seed";

const db = getDb();
await runMigrations(db);
await seedProfiles(db);
console.log("Seeded profiles (Davi, Nicole).");
process.exit(0);
