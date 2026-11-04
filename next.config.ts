import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  // package.json is the one place the version lives; the login page stamp reads it at build time.
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
};

export default nextConfig;
