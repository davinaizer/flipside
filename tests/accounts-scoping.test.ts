// AC29: two accounts, each sees only its own profiles and data (AU6). getCurrentProfile checks
// the sign-in token itself, so these route calls bypass the proxy on purpose.
import { expect, test, vi, inject } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AVATAR_IDS } from "@/shared/avatars";
import { freshDatabase } from "./helpers/db";

test("two accounts: profiles, data and profile ids stay inside their account", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_accounts_scoping");
  vi.stubEnv("DATABASE_URL", url);
  vi.stubEnv("IMAGE_STORE_PATH", await mkdtemp(join(tmpdir(), "flipside-img-")));
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("./factories");
  const { createAccount } = await import("@/server/accounts");
  const { issueSignInToken, revokeSignInToken } = await import("@/server/sign-in");
  const { images } = await import("@/server/db/schema");

  // Account one is the factories' default account; account two gets its own token.
  const one = await f.defaultTestAccount(db);
  const two = await createAccount("two@flipside.local", "a long enough password", db);
  const { token: tokenTwo } = await issueSignInToken(two.id, db);
  const tokenOne = f.TEST_SIGN_IN_TOKEN;

  const ada = await f.createProfile(db, { name: "Ada", accountId: one });
  const bo = await f.createProfile(db, { name: "Bo", accountId: two.id });
  const deck = await f.createDeck(db, ada.id);
  const card = await f.createCard(db, deck.id);
  const review = await f.createReviewLog(db, ada.id, card.id);
  const [image] = await db
    .insert(images)
    .values({
      ownerProfileId: ada.id,
      sha256: "c".repeat(64),
      mime: "image/png",
      bytes: 1,
      storageKey: "images/x.png",
    })
    .returning();

  const as = (token: string, profileId?: string, cookie = "") =>
    new Request("http://x/", {
      method: "GET",
      headers: {
        cookie: `flipside_sign_in=${token}${cookie}`,
        ...(profileId ? { "x-profile-id": profileId } : {}),
      },
    });
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

  // Each picker lists only its own profiles.
  const profilesRoute = await import("@/app/api/v1/profiles/route");
  const names = async (token: string) =>
    ((await (await profilesRoute.GET(as(token))).json()).profiles as { name: string }[]).map(
      (p) => p.name,
    );
  expect(await names(tokenOne)).toEqual(["Ada"]);
  expect(await names(tokenTwo)).toEqual(["Bo"]);

  // Add User creates the profile inside the signed-in account (P5).
  const created = await profilesRoute.POST(
    new Request("http://x/", {
      method: "POST",
      headers: { cookie: `flipside_sign_in=${tokenTwo}` },
      body: JSON.stringify({ name: "Cy", avatar: AVATAR_IDS[0] }),
    }),
  );
  expect(created.status).toBe(201);
  expect(await names(tokenTwo)).toEqual(["Bo", "Cy"]);
  expect(await names(tokenOne)).toEqual(["Ada"]);

  // Selecting the other account's profile is "does not exist".
  const select = await import("@/app/api/v1/session/profile/route");
  const selectAs = (token: string, profileId: string) =>
    select.POST(
      new Request("http://x/", {
        method: "POST",
        headers: { cookie: `flipside_sign_in=${token}` },
        body: JSON.stringify({ profileId }),
      }),
    );
  expect((await selectAs(tokenTwo, ada.id)).status).toBe(404);
  expect((await selectAs(tokenOne, ada.id)).status).toBe(200);

  // The other account's profile id, as header or cookie, is 401.
  const me = await import("@/app/api/v1/me/route");
  expect((await me.GET(as(tokenOne, ada.id))).status).toBe(200);
  expect((await me.GET(as(tokenTwo, ada.id))).status).toBe(401);
  expect((await me.GET(as(tokenTwo, undefined, `; flipside_profile=${ada.id}`))).status).toBe(401);

  // A profile cookie or header with no token is 401 even past the proxy.
  expect(
    (await me.GET(new Request("http://x/", { headers: { cookie: `flipside_profile=${ada.id}` } })))
      .status,
  ).toBe(401);
  expect(
    (await me.GET(new Request("http://x/", { headers: { "x-profile-id": ada.id } }))).status,
  ).toBe(401);

  // Signed in to account two as Bo, account one's deck, session, review and image are 404.
  const decks = await import("@/app/api/v1/decks/[id]/route");
  const sessions = await import("@/app/api/v1/sessions/[id]/route");
  const summary = await import("@/app/api/v1/sessions/[id]/summary/route");
  const reviews = await import("@/app/api/v1/reviews/[id]/route");
  const imageRoute = await import("@/app/api/v1/images/[id]/route");
  const sessionId = crypto.randomUUID();
  const started = await sessions.PUT(
    new Request("http://x/", {
      method: "PUT",
      headers: { ...f.asProfile(ada.id), "content-type": "application/json" },
      body: JSON.stringify({ scope: { kind: "deck", deckId: deck.id }, length: 5 }),
    }),
    ctx(sessionId),
  );
  expect(started.status).toBe(200);
  expect((await summary.GET(as(tokenOne, ada.id), ctx(sessionId))).status).toBe(200);

  const asBo = () => as(tokenTwo, bo.id);
  expect((await decks.GET(asBo(), ctx(deck.id))).status).toBe(404);
  expect((await summary.GET(asBo(), ctx(sessionId))).status).toBe(404);
  expect(
    (await reviews.DELETE(new Request("http://x/", { headers: asBo().headers }), ctx(review.id)))
      .status,
  ).toBe(404);
  expect((await imageRoute.GET(asBo(), ctx(image.id))).status).toBe(404);

  // A revoked token is refused on data routes, not only at log out (AC27, AU7).
  await revokeSignInToken(tokenTwo, db);
  expect((await me.GET(asBo())).status).toBe(401);
  expect((await profilesRoute.GET(as(tokenTwo))).status).toBe(401);
});
