/** What Next's `cookies()` returns, reduced to the one method the server reads. */
export type CookieJar = { get(name: string): { value: string } | undefined };

/** A cookie's value from a request's Cookie header or a Next cookie jar; null when absent. */
export function readCookie(source: Request | CookieJar, name: string): string | null {
  if (!(source instanceof Request)) return source.get(name)?.value ?? null;
  for (const part of (source.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}
