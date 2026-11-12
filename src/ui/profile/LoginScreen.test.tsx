import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

import { LoginForm } from "./LoginScreen";

test("shows email and password fields, the theme toggle and the picker layout, with no error at first", () => {
  const html = renderToStaticMarkup(<LoginForm onSubmit={() => {}} error={null} />);
  expect(html).toMatch(
    /<input[^>]*type="password"[^>]*name="password"|<input[^>]*name="password"[^>]*type="password"/,
  );
  expect(html).toMatch(/<input[^>]*name="email"/);
  expect(html).toContain("Flipside");
  expect(html).toContain("min-h-screen");
  expect(html).toMatch(/role="switch"|type="checkbox"/);
  expect(html).not.toContain('role="alert"');
});

test("shows the neutral error in an alert", () => {
  const html = renderToStaticMarkup(
    <LoginForm
      onSubmit={() => {}}
      error="That email and password did not work. Please try again."
    />,
  );
  expect(html).toContain('role="alert"');
  expect(html).toContain("That email and password did not work");
});

test("login posts the email and password to /auth/login", async () => {
  const fetchMock = vi.fn(async () => Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
  const { api } = await import("@/ui/api/client");
  await api.login("a@b.co", "pw");
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/v1/auth/login",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "a@b.co", password: "pw" }),
    }),
  );
  vi.unstubAllGlobals();
});

test("stamps the app version at the bottom of the page", async () => {
  const { default: nextConfig } = await import("../../../next.config");
  const { default: pkg } = await import("../../../package.json");
  // The stamp reads the build-time value: v<package version>+<commit count>.<short sha>, or +dev without git.
  const stamp = nextConfig.env?.NEXT_PUBLIC_APP_VERSION ?? "";
  const escaped = pkg.version.replaceAll(".", "\\.");
  expect(stamp).toMatch(new RegExp(`^v${escaped}\\+(\\d+\\.[0-9a-f]+|dev)$`));
  vi.stubEnv("NEXT_PUBLIC_APP_VERSION", stamp);
  vi.resetModules();
  const { LoginForm: Form } = await import("./LoginScreen");
  const html = renderToStaticMarkup(<Form onSubmit={() => {}} error={null} />);
  expect(html).toContain(stamp);
  vi.unstubAllEnvs();
});
