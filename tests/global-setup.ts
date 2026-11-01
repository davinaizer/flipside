import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import type { TestProject } from "vitest/node";

const IMAGE = "docker.io/library/postgres:17";

declare module "vitest" {
  export interface ProvidedContext {
    testDatabaseUrl: string;
    testContainer: string;
  }
}

function podman(args: string[]): string {
  return execFileSync("podman", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function fail(msg: string): never {
  throw new Error(`test database: ${msg}`);
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
  });
}

function checkPodman(): void {
  try {
    execFileSync("podman", ["--version"], { stdio: "ignore" });
  } catch {
    fail("podman is not installed or not on PATH; install it to run tests");
  }
  try {
    execFileSync("podman", ["info"], { stdio: "ignore", timeout: 30000 });
  } catch {
    fail("podman is not reachable; start it with 'podman machine start'");
  }
}

export default async function setup(project: TestProject): Promise<() => void> {
  checkPodman();
  const name = `flipside-test-${process.pid}-${randomBytes(3).toString("hex")}`;
  const remove = () => {
    try {
      podman(["rm", "-f", "-t", "0", name]);
    } catch {
      /* already gone */
    }
  };
  const onSignal = () => {
    remove();
    process.exit(1);
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  try {
    const port = await freePort();
    podman([
      "run",
      "-d",
      "--name",
      name,
      "-p",
      `127.0.0.1:${port}:5432`,
      "--tmpfs",
      "/var/lib/postgresql/data:rw",
      "-e",
      "POSTGRES_USER=flipside",
      "-e",
      "POSTGRES_PASSWORD=flipside",
      "-e",
      "POSTGRES_DB=flipside_test",
      IMAGE,
      "-c",
      "fsync=off",
      "-c",
      "synchronous_commit=off",
      "-c",
      "full_page_writes=off",
    ]);
    let ready = false;
    for (let i = 0; i < 120 && !ready; i++) {
      try {
        // The entrypoint restarts postgres once after init; TCP check avoids the temp server.
        podman([
          "exec",
          name,
          "pg_isready",
          "-U",
          "flipside",
          "-d",
          "flipside_test",
          "-h",
          "127.0.0.1",
        ]);
        ready = true;
      } catch {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    if (!ready) fail("postgres did not become ready in time");
    project.provide("testContainer", name);
    project.provide(
      "testDatabaseUrl",
      `postgres://flipside:flipside@127.0.0.1:${port}/flipside_test`,
    );
  } catch (e) {
    remove();
    throw e;
  }
  return remove;
}
