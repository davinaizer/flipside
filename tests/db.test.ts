import { inject, expect, test } from "vitest";
import { psql } from "./helpers/db";

test("test database is Postgres 17", () => {
  const container = inject("testContainer");
  expect(inject("testDatabaseUrl")).toMatch(/^postgres:\/\/.+@127\.0\.0\.1:\d+\/flipside_test$/);
  expect(psql(container, "show server_version_num")).toMatch(/^17\d{4}$/);
});
