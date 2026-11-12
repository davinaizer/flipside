// Usage: pnpm account:create <email> [--adopt-profiles]
//        pnpm account:password <email>
// Asks for the password (hidden, twice). Needs DATABASE_URL. No sign-up endpoint exists (AU4).
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { createInterface } from "node:readline";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { adoptProfiles, createAccount, findAccountId, setPassword } from "@/server/accounts";

export type Prompt = (question: string) => Promise<string>;

/** Runs one command ("create" or "password") and returns the line to print; throws on failure. */
export async function runAccountCli(
  argv: string[],
  prompt: Prompt,
  db: Db = getDb(),
): Promise<string> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { "adopt-profiles": { type: "boolean", default: false } },
  });
  const [command, email] = positionals;
  if ((command !== "create" && command !== "password") || !email) {
    throw new Error("Usage: pnpm account:create <email> [--adopt-profiles] | pnpm account:password <email>");
  }
  if (command === "password" && values["adopt-profiles"]) {
    throw new Error("--adopt-profiles belongs to account:create.");
  }
  const accountId = command === "password" ? await findAccountId(email, db) : null;
  if (command === "password" && !accountId) throw new Error(`No account with email "${email}".`);

  const password = await prompt("Type the password: ");
  if ((await prompt("Confirm the password: ")) !== password) throw new Error("The passwords differ.");

  if (command === "password") {
    await setPassword(accountId!, password, db);
    return `Password changed for ${email}; every sign-in token is revoked.`;
  }
  // createAccount validates the email and password before writing anything.
  const account = await createAccount(email, password, db);
  if (!values["adopt-profiles"]) return `Created account ${account.email}.`;
  const n = await adoptProfiles(account.id, db);
  return `Created account ${account.email} and adopted ${n} profile(s).`;
}

/**
 * Reads a line without echoing it. The question goes through rl.question so readline's own line
 * refresh keeps it on screen; only the typed characters are muted (the flag is set after the
 * question is written). Input and output are parameters so a test can drive it with a fake TTY.
 */
export function terminalPrompt(
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout,
): Prompt {
  return (question) =>
    new Promise((resolve) => {
      const rl = createInterface({ input, output, terminal: (output as { isTTY?: boolean }).isTTY === true });
      const hook = rl as unknown as { _writeToOutput: (s: string) => void };
      const write = hook._writeToOutput.bind(rl);
      let muted = false;
      hook._writeToOutput = (s) => {
        if (!muted) write(s);
      };
      rl.question(question, (answer) => {
        rl.close();
        output.write("\n");
        resolve(answer);
      });
      muted = true;
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(await runAccountCli(process.argv.slice(2), terminalPrompt()));
    process.exit(0);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
