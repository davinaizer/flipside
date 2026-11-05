import { afterEach, expect, test, vi } from "vitest";
import { logOut } from "./sign-out";

afterEach(() => vi.unstubAllGlobals());

test("logOut POSTs /auth/logout then pushes /login", async () => {
  const fetchMock = vi.fn(async () => Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
  const push = vi.fn();
  await logOut(push);
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/v1/auth/logout",
    expect.objectContaining({ method: "POST" }),
  );
  expect(push).toHaveBeenCalledWith("/login");
});

test("logOut still pushes /login when logout returns 401", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ error: { code: "UNAUTHORIZED", message: "no" } }, { status: 401 }),
    ),
  );
  const push = vi.fn();
  await logOut(push);
  expect(push).toHaveBeenCalledWith("/login");
});

test("logOut still pushes /login when fetch throws", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("offline");
    }),
  );
  const push = vi.fn();
  await logOut(push);
  expect(push).toHaveBeenCalledWith("/login");
});
