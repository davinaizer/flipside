// Starts a throwaway Postgres (Podman), builds and serves the app against it.
// Used by Playwright's webServer; cleans the container up on exit.
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";

const appPort = process.env.E2E_PORT ?? "3100";
const name = `flipside-e2e-${process.pid}-${randomBytes(3).toString("hex")}`;
const podman = (args) =>
  execFileSync("podman", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

let child;
let removed = false;
function cleanup() {
  if (removed) return;
  removed = true;
  child?.kill("SIGTERM");
  try {
    podman(["rm", "-f", "-t", "0", name]);
  } catch {
    /* already gone */
  }
}
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => {
    cleanup();
    process.exit(1);
  });
}
process.on("exit", cleanup);

// Playwright may SIGKILL this process; a detached watchdog still removes the container.
spawn(
  "sh",
  ["-c", `while kill -0 ${process.pid} 2>/dev/null; do sleep 1; done; podman rm -f -t 0 ${name} >/dev/null 2>&1`],
  { detached: true, stdio: "ignore" },
).unref();

const dbPort = await freePort();
podman([
  "run", "-d", "--name", name, "-p", `127.0.0.1:${dbPort}:5432`,
  "--tmpfs", "/var/lib/postgresql/data:rw",
  "-e", "POSTGRES_USER=flipside", "-e", "POSTGRES_PASSWORD=flipside", "-e", "POSTGRES_DB=flipside_e2e",
  "docker.io/library/postgres:17", "-c", "fsync=off",
]);
let ready = false;
for (let i = 0; i < 120 && !ready; i++) {
  try {
    podman(["exec", name, "pg_isready", "-U", "flipside", "-d", "flipside_e2e", "-h", "127.0.0.1"]);
    ready = true;
  } catch {
    await new Promise((r) => setTimeout(r, 500));
  }
}
if (!ready) {
  console.error("e2e database did not become ready");
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_URL: `postgres://flipside:flipside@127.0.0.1:${dbPort}/flipside_e2e`,
  PORT: appPort,
};
const run = (args) =>
  new Promise((resolve, reject) => {
    child = spawn("pnpm", args, { env, stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`pnpm ${args.join(" ")} exited ${code}`))));
  });
try {
  await run(["exec", "next", "build"]);
  await run(["db:seed"]); // migrates, then adds Davi and Nicole for the picker tests
  await run(["exec", "next", "start", "-H", "127.0.0.1", "-p", appPort]);
} catch (e) {
  console.error(String(e));
  process.exitCode = 1;
}
cleanup();
