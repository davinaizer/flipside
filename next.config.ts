import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";
import { version } from "./package.json";

// `v<package>+<build>.<short sha>`, with the build number from the git commit count.
// package.json stays the one place the version lives. If git is unavailable the build
// part is `dev`; the build never fails.
function appVersion(): string {
  const git = (...args: string[]) =>
    execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  try {
    const build = git("rev-list", "--count", "HEAD");
    const sha = git("rev-parse", "--short", "HEAD");
    return `v${version}+${build}.${sha}`;
  } catch {
    return `v${version}+dev`;
  }
}

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: appVersion() },
};

export default nextConfig;
