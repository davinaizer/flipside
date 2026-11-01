import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";

const forbiddenInDomain = [
  {
    group: ["**/server", "**/server/**", "@/server", "@/server/**"],
    message: "domain must not import server (PRD 9).",
  },
  {
    group: ["drizzle-orm", "drizzle-orm/**", "drizzle-kit", "pg", "postgres", "**/db", "**/db/**"],
    message: "domain is pure: no database modules.",
  },
  {
    group: ["node:*", "fs", "fs/*", "path", "child_process", "http", "https", "net"],
    message: "domain is pure: no I/O.",
  },
];

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextVitals,
  prettier,
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: forbiddenInDomain }] },
  },
];
export default config;
