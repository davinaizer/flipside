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
