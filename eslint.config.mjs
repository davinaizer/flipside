import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";

// Layer boundaries (PRD section 9). Each layer lists what it must not import; the mirror
// rules are what keep the layers one-way: app -> server -> domain, ui -> api, shared at the bottom.
const dbModules = ["drizzle-orm", "drizzle-orm/**", "drizzle-kit", "pg", "postgres"];
const noDb = { group: dbModules, message: "only src/server talks to the database." };
const noServer = (why) => ({
  group: ["**/server", "**/server/**", "@/server", "@/server/**"],
  message: why,
});
const noUi = (why) => ({ group: ["**/ui", "**/ui/**", "@/ui", "@/ui/**"], message: why });
const noApp = (why) => ({ group: ["**/app", "**/app/**", "@/app", "@/app/**"], message: why });
const noDomain = (why) => ({
  group: ["**/domain", "**/domain/**", "@/domain", "@/domain/**"],
  message: why,
});

const forbiddenIn = {
  domain: [
    noServer("domain must not import server (PRD 9)."),
    noUi("domain is pure: no UI."),
    noApp("domain is pure: no routes."),
    {
      group: [...dbModules, "**/db", "**/db/**"],
      message: "domain is pure: no database modules.",
    },
    {
      group: ["node:*", "fs", "fs/*", "path", "child_process", "http", "https", "net"],
      message: "domain is pure: no I/O.",
    },
  ],
  shared: [
    noServer("shared is the bottom layer: it imports nothing from server."),
    noUi("shared is the bottom layer: it imports nothing from ui."),
    noApp("shared is the bottom layer: it imports nothing from app."),
    noDomain("shared is the bottom layer: it imports nothing from domain."),
    noDb,
  ],
  server: [noUi("server must not import ui."), noApp("server must not import routes.")],
  ui: [
    noServer("ui reaches the server only through the API (src/ui/api/client.ts)."),
    noApp("ui must not import routes."),
    noDb,
  ],
  app: [
    {
      group: [...dbModules, "**/server/db", "**/server/db/**", "@/server/db", "@/server/db/**"],
      message: "routes parse input and call a service; they do not touch the database (PRD 9).",
    },
  ],
};

// The UUID pattern lives in src/shared/uuid.ts (isUuid); copies drift apart.
const noUuidRegexLiteral = {
  selector: "Literal[regex.pattern=/0-9a-f\\]\\{8\\}-/]",
  message: "Use isUuid from @/shared/uuid instead of writing the UUID pattern again.",
};

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
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  ...Object.entries(forbiddenIn).map(([layer, patterns]) => ({
    files: [`src/${layer}/**/*.{ts,tsx}`],
    ignores: ["**/*.test.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns }] },
  })),
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/shared/uuid.ts", "**/*.test.{ts,tsx}"],
    rules: { "no-restricted-syntax": ["error", noUuidRegexLiteral] },
  },
];
export default config;
