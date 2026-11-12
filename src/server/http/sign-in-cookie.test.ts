import { expect, test } from "vitest";
import { clearSignInCookie, signInCookie } from "./sign-in-cookie";

const req = (url: string, headers: Record<string, string> = {}) => new Request(url, { headers });

test.each([
  ["https URL", "https://flipside.example/api", {}, true],
  ["http localhost", "http://localhost:3000/api", {}, false],
  ["http LAN IP", "http://10.129.224.39:3000/api", {}, false],
  [
    "http URL with x-forwarded-proto https",
    "http://10.0.0.5:3000/api",
    { "x-forwarded-proto": "https, http" },
    true,
  ],
])("Secure flag: %s", (_n, url, headers, secure) => {
  expect(signInCookie(req(url, headers), "t").includes("; Secure")).toBe(secure);
  expect(clearSignInCookie(req(url, headers)).includes("; Secure")).toBe(secure);
});
