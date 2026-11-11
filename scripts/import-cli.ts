// Usage: pnpm import:cli <file> --profile <name> [--name <deck>] [--group <g>] [--color <c>]
//        [--answer-style <s>] [--deck <deckId>]   (--deck re-imports into that deck)
// Goes through the same commitImport service as POST /imports. Needs DATABASE_URL. The image driver
// follows IMAGE_STORE_DRIVER (vercel-blob also needs BLOB_READ_WRITE_TOKEN). The 4 MB web limit does
// not apply here: it is checked only when reading an HTTP upload.
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { profiles } from "@/server/db/schema";
import { commitImport } from "@/server/imports";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    profile: { type: "string" },
    name: { type: "string" },
    group: { type: "string" },
    color: { type: "string", default: "mist" },
    "answer-style": { type: "string", default: "bullets" },
    deck: { type: "string" },
  },
});

const [file] = positionals;
if (!file || !values.profile) {
  console.error("Usage: pnpm import:cli <file> --profile <name> [--name <deck>] [--group <g>] [--color <c>] [--answer-style <s>] [--deck <id>]");
  process.exit(2);
}

try {
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.name, values.profile));
  if (!profile) throw new Error(`Unknown profile "${values.profile}".`);
  const details: Record<string, unknown> = {
    name: values.name ?? basename(file, extname(file)),
    group: values.group,
    color: values.color,
    answerStyle: values["answer-style"],
  };
  if (values.deck) details.deckId = values.deck;
  const result = await commitImport(
    profile.id,
    { bytes: new Uint8Array(await readFile(file)), filename: basename(file), details },
    db,
  );
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
