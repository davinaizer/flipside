/** App version, `v<package>+<build>.<sha>`, inlined at build time by next.config.ts. "dev" outside a Next build (tests). */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
