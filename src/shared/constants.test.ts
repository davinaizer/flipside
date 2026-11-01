import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";
import { APP_NAME } from "./constants";

describe("smoke", () => {
  it("exposes the app name", () => {
    expect(APP_NAME).toBe("Flipside");
  });
});

describe("domain layer boundary", () => {
  const lint = async (code: string) => {
    const eslint = new ESLint();
    const [r] = await eslint.lintText(code, { filePath: "src/domain/sample.ts" });
    return r.messages.filter((m) => m.ruleId === "no-restricted-imports");
  };

  it.each([
    'import "../server/decks";',
    'import "@/server/decks";',
    'import "drizzle-orm";',
    'import "../server/db";',
    'import fs from "node:fs";',
  ])("rejects %s", async (code) => {
    expect((await lint(code)).length).toBeGreaterThan(0);
  });

  it("allows shared imports", async () => {
    expect(
      await lint('import { APP_NAME } from "../shared/constants"; export const a = APP_NAME;'),
    ).toEqual([]);
  });
});
