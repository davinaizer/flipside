---
title: Over-engineering, boilerplate, comments and defensive code
id: AUD-20261105-over-engineering
type: over-engineering
status: open
createdAt: 2026-11-05
updatedAt: 2026-11-05
author: Claude Sonnet 5.5
commit: 5129010
scope:
  - src/
  - scripts/
  - e2e/
coverage: partial
counts:
  high: 0
  medium: 7
  low: 16
  nit: 4
tags: [duplication, boilerplate, comments, defensive-code]
---

# Over-engineering, boilerplate, comments and defensive code

Standard: [README.md](README.md). Read-only: this audit changes no code.

## Summary

The code is disciplined and has no high-severity problems. The waste is duplication of rules and wrappers (UUID check, validation errors, route try/catch, JSON body parsing), a few identity copies and unused exports, and defensive code with no call site that needs it. The biggest wins are OE-01 to OE-04 (server boilerplate) and OE-25 (a 179-line status-line script that is not part of the product). Findings come from two passes: the first sampled the large server and domain files plus grep sweeps; the second read the import pipeline, the main UI screens, `scripts/` and the e2e helpers.

Line references are valid at commit `5129010`.

## Findings

### Medium

#### OE-01 The UUID regex is copy-pasted six times, beside a second way of checking

- **Severity:** medium
- **Status:** open
- **Where:** `src/server/decks.ts:16`, `src/server/imports.ts:28`, `src/server/profile.ts:17`, `src/server/images/service.ts:8`, `src/server/sessions.ts:23`; `src/server/reviews.ts:67,216` use `z.string().uuid().safeParse`.
- **Why:** One domain rule written six times, which the DRY principle in `CLAUDE.md` says to avoid. The two styles also differ in behaviour: the regex versions answer 404 or 401, reviews answers 400 `invalid_id`.
- **Recommendation:** Add one `isUuid(id)` helper in `src/shared`, built on Zod, and delete the copies. Keep the 404-versus-400 difference explicit at each call site.

#### OE-02 The `issues.map(...)` into `ApiError(400, ...)` block is repeated about 8 times

- **Severity:** medium
- **Status:** open
- **Where:** `src/server/decks.ts:223`, `src/server/settings.ts:28`, `src/server/profile.ts:80-85,111-116`, `src/server/sessions.ts:216-221`, `src/server/reviews.ts:71-76`, `src/server/imports.ts:52`.
- **Why:** The same 6 to 8 lines are repeated. `imports.ts:52` is already inconsistent: it spreads the raw Zod issue (`{ ...i }`) instead of `{path, message}`, so its error `details` have a different shape from the rest of the API.
- **Recommendation:** Add `parseOrThrow(schema, body, message, status = 400)` next to `ApiError` in `src/server/http/errors.ts`. This also fixes the `imports.ts` inconsistency.

#### OE-03 Every route repeats `try { ... } catch (e) { return toErrorResponse(e) }`

- **Severity:** medium
- **Status:** open
- **Where:** 15 route files under `src/app/api/v1/**`, for example `decks/[id]/route.ts:10-36`, `library/route.ts:8-13`.
- **Why:** Each handler carries about 4 lines of identical wrapper. `toErrorResponse` rethrows anything that is not an `ApiError`, so the try/catch exists only to translate one error type.
- **Recommendation:** Add a `handle(fn)` wrapper that resolves the profile and maps `ApiError`. Best readability win in the repo; do it only if you accept touching all 15 routes.

#### OE-04 JSON body parsing is done three different ways

- **Severity:** medium
- **Status:** open
- **Where:** `src/app/api/v1/sessions/[id]/route.ts:13-21`, `decks/[id]/route.ts:21-22`, `settings/route.ts:19`, `auth/login/route.ts:10`.
- **Why:** Sessions reads text, trims it and nests a try/catch around `JSON.parse`. The deck route uses `.catch(() => undefined)` and a sentinel check. Login uses `.catch(() => null)` and hands the result to Zod.
- **Recommendation:** Add one `readJson(request)` helper. The empty-body-means-resume behaviour of sessions can stay as a flag.

#### OE-14 Identity "converters" copy objects for no reason

- **Severity:** medium
- **Status:** open
- **Where:** `src/domain/import-file.ts:22-23` (used at 58, 72, 79); related `src/server/imports.ts:52`.
- **Why:** `fromCsv` and `fromZip` are `(i) => ({ ...i })`. Nothing is transformed. If the types are not assignable, the fix is to align the types, not to copy at runtime.
- **Recommendation:** Delete both helpers and make `ImportIssue` the one shared issue type. If `ZipIssue.code` is too narrow, widen it to `string`.

#### OE-15 Start-practice and load-state logic is copy-pasted across screens

- **Severity:** medium
- **Status:** open
- **Where:** `src/ui/library/LibraryScreen.tsx:22-50`, `src/ui/deck/DeckScreen.tsx:32-40` (same `busy`/`startError` block and same message); `src/ui/profile/ProfilePicker.tsx:26-36`, `LibraryScreen.tsx:22-33` (same `loading | error | ready` state machine and retry).
- **Why:** Two copies each, with identical copy text.
- **Recommendation:** Extract a `useStartPractice()` hook, and optionally a small `useLoad(fetcher)`. At two copies this is borderline: do it when a third screen appears, but share the message string now.

#### OE-16 `DeleteDeck` bypasses the API client

- **Severity:** medium
- **Status:** open
- **Where:** `src/ui/deck/delete-deck/DeleteDeck.tsx:26-27`.
- **Why:** Raw `fetch` to `/api/v1/decks/...`, then `throw new Error("delete failed")` only to land in its own `catch`. Every other call goes through `api.*`, which adds schema parsing and typed errors.
- **Recommendation:** Add `api.deleteDeck(id)` and drop the throw-to-catch.

### Low

#### OE-05 `resolveHome` and `profileFromCookie` fabricate a `Request`

- **Severity:** low
- **Status:** open
- **Where:** `src/server/profile.ts:130-157`.
- **Why:** Both build `new Request("http://local/", { headers: { cookie } })` to reuse `getCurrentProfile`, then catch its 401 `ApiError` to turn it back into a value. The two functions duplicate each other's catch logic.
- **Recommendation:** Split a `profileById(id, db): Profile | null` out of `getCurrentProfile`. Then `profileFromCookie` is a one-liner and `resolveHome` is `profileFromCookie(...) ? "library" : "picker"`.

#### OE-06 `requireProfileById` is a near-duplicate lookup

- **Severity:** low
- **Status:** open
- **Where:** `src/server/profile.ts:52-56` (compare lines 38-39).
- **Why:** The same select as `getCurrentProfile`, with a different error.
- **Recommendation:** Falls away once OE-05's `profileById` exists.

#### OE-07 `sidebar-state.ts` has four layers of defence for localStorage

- **Severity:** low
- **Status:** open
- **Where:** `src/ui/shell/sidebar-state.ts:4-36`.
- **Why:** A `typeof localStorage` check, a try/catch on access, one on read, one on write, plus an in-memory fallback. About 40 lines for a UI preference. The comment justifies it, but the failure mode is private mode and a stored boolean.
- **Recommendation:** Keep one try/catch on read and one on write; drop the `storage()` indirection. Drop the injected `store` parameters too if they exist only for tests.

#### OE-08 UI catches swallow errors with no behaviour

- **Severity:** low
- **Status:** open
- **Where:** `src/ui/settings/ThemeToggle.tsx:14`, `ReadingSettings.tsx:46`, `PracticeSettings.tsx:29`, `src/ui/practice/use-session.ts:132,173,181`, `src/ui/profile/sign-out.ts:7-9`.
- **Why:** `.catch(() => {})` and empty `catch {}`. Some are right (logout goes to `/login` anyway). But `createSettingsSaver` already rolls back and rethrows, and three callers each re-swallow it.
- **Recommendation:** Make the saver's `update` non-throwing, or add one `saveSettings` hook that handles it. Leave the logout case.

#### OE-09 `saver.ts` has more machinery than the app needs

- **Severity:** low
- **Status:** open
- **Where:** `src/ui/settings/saver.ts:9-39`.
- **Why:** Promise chain, version counter, `confirmed` and `current`, rollback only if nothing newer changed. Sound design, documented, but the problem is rapid toggles on three small settings panels.
- **Recommendation:** Keep it if a test depends on the ordering guarantee. Otherwise last-write-wins with `PUT` would do.

#### OE-12 Non-null assertions that trust an unstated invariant

- **Severity:** low
- **Status:** open
- **Where:** `src/server/reviews.ts:43` (`row.sessionId!`), `src/server/sessions.ts:263` (`(await findSessionRow(...))!`), `src/domain/stats.ts:334` (`deckName.get(...)!`), `src/server/imports.ts:112` (`imageIds.get(...)!`).
- **Why:** Not defensive checks but the opposite: each is safe by construction, and nothing says so.
- **Recommendation:** Add a one-line "why this cannot be null" comment, or restructure the types. No extra runtime checks.

#### OE-17 Exports used by nothing but tests, or by nothing

- **Severity:** low
- **Status:** open
- **Where:** `src/domain/image-check.ts` (`sha256Hex`, `imageStorageKey` used nowhere outside the file; `readImageSize` used only by `zip-import.test.ts`); `src/domain/zip-import.ts` (`readZipDirectory` used only inside the file; `baseName` only in its test).
- **Why:** Public surface larger than any caller needs.
- **Recommendation:** Un-export them and test through `checkImage` or `openZip`.

#### OE-18 Hard-coded "200 MB" next to its own constant

- **Severity:** low
- **Status:** open
- **Where:** `src/domain/zip-import.ts:113,128`.
- **Why:** The message says "200 MB" but the limit is `IMPORT_MAX_ZIP_UNCOMPRESSED_BYTES`; changing the constant makes the text wrong. The same message is also written twice.
- **Recommendation:** Derive the text from the constant, as `image-check.ts:128` does for the image limit.

#### OE-19 The zip is size-checked twice, and the second check runs after the cost is paid

- **Severity:** low
- **Status:** open
- **Where:** `src/domain/zip-import.ts:99-131`.
- **Why:** Declared sizes then inflated sizes is justified (declared sizes can lie, line 124 says so). But `unzipSync` has already inflated everything when the second check runs, so it does not protect against a zip bomb. This is a risk question, not over-engineering.
- **Recommendation:** Cap inflation up front with fflate's `filter` (it receives `originalSize`), or stop implying the second check protects memory.

#### OE-20 Hand-rolled image header parsers

- **Severity:** low
- **Status:** open
- **Where:** `src/domain/image-check.ts:33-107`.
- **Why:** About 75 lines of byte-offset code for four formats. Likely the intended trade-off, since `CLAUDE.md` forbids new dependencies.
- **Recommendation:** Do not rewrite. Add one comment saying why no library is used, and note that `file-type` is already a dependency.

#### OE-21 The profile name rule lives twice

- **Severity:** low
- **Status:** open
- **Where:** `src/ui/profile/ProfileScreen.tsx:12-18`.
- **Why:** `nameError` re-implements the server rule (trim, 1 to 24). The comment admits "the server stays the authority".
- **Recommendation:** Import the Zod schema from `src/shared/schemas/profile` and take the message from its error.

#### OE-22 Cast-heavy glue in the profile forms

- **Severity:** low
- **Status:** open
- **Where:** `src/ui/profile/ProfileScreen.tsx:144`, `src/ui/profile/ProfilePicker.tsx:151`.
- **Why:** `avatar` is typed `string` in `ProfileForm`, then cast back with `as AvatarId` at both call sites.
- **Recommendation:** Type `avatar` as `AvatarId` in the form props and remove both casts.

#### OE-23 Formatting slips that lint did not catch

- **Severity:** low
- **Status:** open
- **Where:** `src/ui/profile/ProfileScreen.tsx:78` (`id={...}role="alert"`, missing space), `src/ui/profile/ProfilePicker.tsx:110-124` (JSX over-indented by 4 spaces).
- **Why:** Suggests no formatter runs, or it does not cover these files.
- **Recommendation:** Run the formatter; if `verify.sh` already runs one, find out why these passed.

#### OE-25 `scripts/statusline.sh` is outside the product

- **Severity:** low
- **Status:** open
- **Where:** `scripts/statusline.sh` (179 lines; header says it is styled after a third-party project).
- **Why:** Three rendering tiers, Nerd Font and Powerline toggles and four environment variables, for a personal status line in a flashcard repo. It does not touch app behaviour. Largest single piece of non-product code found.
- **Recommendation:** Move it to user config (`~/.claude`) or delete it.

#### OE-26 `e2e-server.mjs` has three shutdown mechanisms

- **Severity:** low
- **Status:** open
- **Where:** `scripts/e2e-server.mjs:30-54`.
- **Why:** Signal handlers, an `exit` handler and a detached `sh` watchdog that polls every second. The watchdog covers Playwright sending SIGKILL, which avoids leaked Podman containers, but it is unverified that this happens.
- **Recommendation:** Confirm SIGKILL occurs in practice; if not, drop the watchdog.

#### OE-27 e2e duplicates its own third-party guard

- **Severity:** low
- **Status:** open
- **Where:** `e2e/helpers/index.ts:54-65` (`guardThirdParty`) and `e2e/journey.spec.ts:10-16`.
- **Why:** The journey spec hand-rolls the same "requests outside the local host" check with `page.on("request")`. The two disagree on what counts as local (the helper allows `[::1]`, `data:` and `blob:`; the spec compares the host to `baseURL`).
- **Recommendation:** Reuse the helper.

### Nit

#### OE-10 `ApiClientError` and `ApiError` differ in style

- **Severity:** nit
- **Status:** open
- **Where:** `src/ui/api/client.ts:24-32`, `src/server/http/errors.ts:17-29`.
- **Why:** The client class uses parameter properties; the server class avoids them, and `errors.ts:18` explains why. Harmless.
- **Recommendation:** None required. Mention only if you want consistency.

#### OE-11 Defensive fallbacks in the API client are justified but loosely typed

- **Severity:** nit
- **Status:** open
- **Where:** `src/ui/api/client.ts:41-48`.
- **Why:** The `json as { error?: ... } | null` cast and the `"unknown"` and "Something went wrong." fallbacks cover non-JSON error bodies, which a proxy or a Next 500 can return. The fallback is right; the cast is the weak part.
- **Recommendation:** Leave as is, or replace the cast with a small schema parse.

#### OE-13 Comments that restate the code or lean on spec codes

- **Severity:** nit
- **Status:** open
- **Where:** `src/domain/stats.ts:24,64,114`; `src/server/sessions.ts:36-61`; `src/server/reviews.ts:54-59`; `src/ui/profile/ProfilePicker.tsx:25` and `src/ui/library/LibraryScreen.tsx:28` (same lint-appeasement note twice); `src/ui/import/ImportFlow.tsx:27`; `src/server/imports.ts:12`.
- **Why:** Most comments explain why and should stay (`sessions.ts:48`, `reviews.ts:23-29`, `ProfileScreen.tsx:103`). The weak ones repeat a field or type name, and several rely on PRD codes such as `(R4, R5, R12, N2)` that a reader must look up.
- **Recommendation:** Drop comments that repeat a name; keep the non-obvious why. The PRD references are fine while the PRD stays authoritative.

#### OE-24 `ImportFlow` catch adds an issue code outside the domain vocabulary

- **Severity:** nit
- **Status:** open
- **Where:** `src/ui/import/ImportFlow.tsx:53-58`.
- **Why:** `parseImportFile` returns `{ ok: false }` for every expected failure, so the `catch` only covers `arrayBuffer()` or an unexpected throw. Reasonable, and the only place a thrown error becomes a user message, but the synthetic `code: "unreadable"` is not a code the domain emits.
- **Recommendation:** Keep the catch. Optionally add `unreadable` to the domain's issue codes.

## Not flagged

- `src/domain/day.ts` and `src/domain/stats.ts` are complex but justified: time zones and day-start rules are a genuine risk.
- The `onConflictDoNothing` plus re-read in `src/server/sessions.ts:225-237` is a real idempotency requirement.
- `getImage`'s `ImageNotFoundError` mapping and the `matches()` ETag parser (`src/server/images/service.ts:19-25`) look like a lot of code but cover real HTTP behaviour.
- `LibraryView`'s `matchesQuery` filtering and `ImportFlow`'s `Step` union are proportionate to the screens they drive.
- The long Tailwind class strings in `ImportFlow.tsx:155,167` and `ProfileScreen.tsx:99` implement the focus, pressed and reduced-motion states the design docs require.

## Not covered

Not read in full, so more findings may exist. Expect more duplication and unused exports rather than risky defensive code.

- UI: `PracticeView.tsx`, `SummaryView.tsx`, `ReadingSettings.tsx`, `PracticeSettings.tsx`, `ProgressView.tsx`, `ProfileMenu.tsx`, `Icon.tsx`, `DeckView.tsx`
- Domain: `src/domain/csv-import.ts`, `session-builder.ts`, `session-queue.ts`
- Scripts: `backup.sh`, `restore.sh`, `import-cli.ts`, `stop-check.sh`, and most of `statusline.sh`
- The e2e specs other than `journey.spec.ts` and the helpers
