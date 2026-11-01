import { execFileSync } from "node:child_process";

/** Run a SQL statement inside the test container with psql and return the trimmed output. */
export function psql(container: string, sql: string): string {
  return execFileSync(
    "podman",
    [
      "exec",
      container,
      "psql",
      "-U",
      "flipside",
      "-d",
      "flipside_test",
      "-h",
      "127.0.0.1",
      "-tA",
      "-c",
      sql,
    ],
    { encoding: "utf8" },
  ).trim();
}

/** Create a fresh database next to the shared test one and return its URL (avoids parallel-file races). */
export async function freshDatabase(baseUrl: string, name: string): Promise<string> {
  const { default: postgres } = await import("postgres");
  const admin = postgres(baseUrl, { max: 1, onnotice: () => {} });
  await admin.unsafe(`drop database if exists ${name}`);
  await admin.unsafe(`create database ${name}`);
  await admin.end();
  return baseUrl.replace(/[^/]+$/, name);
}
