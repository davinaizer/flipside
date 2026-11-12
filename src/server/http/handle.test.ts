import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentProfile = vi.fn();
const getCurrentAccount = vi.fn();
vi.mock("@/server/profile", () => ({ getCurrentProfile, getCurrentAccount }));

const { ApiError } = await import("./errors");
const { handle, handleAccount } = await import("./handle");
const req = new Request("http://localhost/x");

beforeEach(() => {
  getCurrentProfile.mockReset();
  getCurrentAccount.mockReset();
});

describe("handle", () => {
  it("passes the request, resolved profile and awaited params to the body", async () => {
    getCurrentProfile.mockResolvedValue({ id: "p1" });
    const res = await handle<{ id: string }>(async ({ profile, params }) =>
      Response.json({ p: profile.id, id: params.id }),
    )(req, { params: Promise.resolve({ id: "d1" }) });
    expect(await res.json()).toEqual({ p: "p1", id: "d1" });
  });

  it("maps an ApiError from the profile lookup or the body to its response", async () => {
    getCurrentProfile.mockRejectedValue(new ApiError(401, "unauthorized", "Choose a profile."));
    const res = await handle(async () => new Response())(req);
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("unauthorized");

    getCurrentProfile.mockResolvedValue({ id: "p1" });
    const res2 = await handle(async () => {
      throw new ApiError(404, "not_found", "Nope");
    })(req);
    expect(res2.status).toBe(404);
  });

  it("rethrows anything else", async () => {
    getCurrentProfile.mockResolvedValue({ id: "p1" });
    await expect(
      handle(async () => {
        throw new Error("boom");
      })(req),
    ).rejects.toThrow("boom");
  });
});

describe("handleAccount", () => {
  it("passes the signed-in account and maps an ApiError without resolving a profile", async () => {
    getCurrentAccount.mockResolvedValue({ id: "a1", email: "a@b.co" });
    const ok = await handleAccount(async ({ account }) => Response.json(account.id))(req);
    expect(await ok.json()).toBe("a1");
    const res = await handleAccount(async () => {
      throw new ApiError(400, "bad", "Bad");
    })(req);
    expect(res.status).toBe(400);
    expect(getCurrentProfile).not.toHaveBeenCalled();
  });

  it("answers 401 when there is no valid sign-in token", async () => {
    getCurrentAccount.mockRejectedValue(new ApiError(401, "unauthorized", "Please sign in first."));
    const fn = vi.fn();
    const res = await handleAccount(fn)(req);
    expect(res.status).toBe(401);
    expect(fn).not.toHaveBeenCalled();
  });
});
