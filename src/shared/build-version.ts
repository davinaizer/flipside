/**
 * Build-time version stamp, `v<package>+<build>.<short sha>` (used by next.config.ts).
 * With git history: commit count and short SHA. Without it (Vercel builds a shallow
 * checkout with no usable history): `vercel.<first 7 of VERCEL_GIT_COMMIT_SHA>`.
 * With neither: `dev`. It never throws, so the build never fails on git.
 */
export function buildVersion(
  packageVersion: string,
  git: (...args: string[]) => string,
  env: Record<string, string | undefined>,
): string {
  try {
    return `v${packageVersion}+${git("rev-list", "--count", "HEAD")}.${git("rev-parse", "--short", "HEAD")}`;
  } catch {
    const sha = env.VERCEL_GIT_COMMIT_SHA;
    return sha ? `v${packageVersion}+vercel.${sha.slice(0, 7)}` : `v${packageVersion}+dev`;
  }
}
