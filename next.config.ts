import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";
import { version } from "./package.json";
import { buildVersion } from "./src/shared/build-version";

const git = (...args: string[]) =>
  execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: buildVersion(version, git, process.env) },
};

export default nextConfig;
