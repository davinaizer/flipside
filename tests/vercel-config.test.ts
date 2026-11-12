import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = JSON.parse(readFileSync("vercel.json", "utf8"));
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

describe("vercel.json (H3)", () => {
  it("deploys the release branch only", () => {
    // Vercel matches branches with minimatch, where "*" stops at "/": "**" is needed so
    // branches such as feat/F22-accounts build nothing. Any matching true rule wins.
    expect(config.git.deploymentEnabled).toEqual({ "**": false, release: true });
  });

  it("builds with the vercel-build script", () => {
    expect(config.buildCommand).toBe("pnpm vercel-build");
    expect(pkg.scripts["vercel-build"]).toContain("drizzle-kit migrate");
  });
});
