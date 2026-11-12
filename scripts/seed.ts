import { getDb } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { seedDevAccount, seedProfiles } from "@/server/seed";

const db = getDb();
await runMigrations(db);
await seedProfiles(db);
const accountId = await seedDevAccount(db);
console.log(
  accountId
    ? "Seeded profiles (Davi, Nicole) and the development account."
    : "Seeded profiles (Davi, Nicole). No account: DEV_ACCOUNT_EMAIL or DEV_ACCOUNT_PASSWORD is unset.",
);
process.exit(0);
