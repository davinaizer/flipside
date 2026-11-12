import { expect, test } from "vitest";
import { hashPassword, verifyPassword } from "@/server/passwords";

test("hash holds scheme, parameters, salt and hash; same password hashes differently", async () => {
  const a = await hashPassword("correct horse battery");
  const b = await hashPassword("correct horse battery");
  expect(a.split("$")).toHaveLength(6);
  expect(a.startsWith("scrypt$16384$8$1$")).toBe(true);
  expect(a).not.toContain("correct horse");
  expect(a).not.toBe(b);
});

test("verifyPassword accepts the right password, rejects wrong and malformed", async () => {
  const h = await hashPassword("correct horse battery");
  expect(await verifyPassword("correct horse battery", h)).toBe(true);
  expect(await verifyPassword("wrong horse battery!", h)).toBe(false);
  for (const bad of [
    "",
    "plain",
    "scrypt$x$8$1$AA==$AA==",
    "scrypt$16384$8$1$$",
    "md5$1$2$3$a$b",
  ]) {
    expect(await verifyPassword("correct horse battery", bad)).toBe(false);
  }
});
