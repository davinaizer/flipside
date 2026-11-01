# Progress

Append-only. One to three lines per task or event: date, task id, what, commit. Read the tail at session start.

- 2026-11-01: workflow scaffolded (docs/WORKFLOW.md, agents, skills, ledger). No code yet.
- 2026-11-01: F0.1 scaffolded Next.js, TS strict, ESLint (domain boundary rule), Prettier, Vitest, src layers.
F0.2: shared constants, enums, settings schema (Zod added per PRD section 9) and uuidv7 in src/shared.
F0.3: scripts/db.sh (podman run, named volume, idempotent), .env.example, zod env parsing in src/server/env.ts.
F0.4: vitest global setup starts a disposable tmpfs Postgres 17 via podman, removed on exit.
F0.5: Drizzle schema for all nine section 10 tables, migration 0000, postgres-js client, schema introspection test.
F0.6: migrations run on start via instrumentation, pnpm db:migrate, GET /api/v1/health with 503 section 11 error format.
F0.7: pnpm db:seed (node with scripts/register-alias.mjs resolve hook, no tsx) seeds Davi and Nicole idempotently by name; tests use per-file databases to avoid parallel migration races.
- F0.8: src/ui/tokens.css (light/dark via data-theme, box tokens, Tailwind @theme), globals.css, contrast and no-raw-hex tests.
F0.9: Atkinson Hyperlegible Next and Lexend bundled via next/font/local; body Atkinson, headings Lexend; font id map in src/ui/font-ids.ts.
F0.10: Playwright desktop and iPad projects, axe in both themes, 44 px and local-request checks; pnpm test:e2e boots its own Postgres and app.
F0.11: CLAUDE.md lists dev, build, start, db:*, test, test:e2e; each was run successfully (db:migrate and db:seed need DATABASE_URL exported from .env.example).
- 2026-11-01: F0 Foundation DONE. PR #3 merged into develop (merge 7cd6aa8). Reviewer PASS; verify and e2e green.
MANUAL PENDING: F0.6 next start on an empty database (covered indirectly by the e2e server, not run by hand); F0.4 missing-podman, stopped-machine and concurrent-run paths.
F1.1: src/domain/day.ts (learningDay, dayStartUtc, addDays, daysBetween, weekStart) via Intl only; fixtures/domain/day-boundary.json covers 07:00 boundary, both London clock changes, NY/Sydney/Kolkata, month/year/leap addition, Monday weeks.
F1.2: src/domain/scheduler.ts applyGrade (New and boxes 1-5, LAPSE_RULE reset/drop_one, leech at 8, requeue flag); fixtures/domain/scheduler.json has the full 36-case matrix plus leech and suspended edge cases.
F1.3: src/domain/grade-labels.ts gradeLabels derives Again today/Tomorrow/In N days from applyGrade's due date; fixtures/domain/grade-labels.json covers all six states, both lapse rules.
F1.4: src/domain/session-builder.ts buildSession (scopes all/deck/topics/topics ignoring due/weak/card list, box-then-due order with injected-random tie shuffle, new last under the daily cap, lengths 5/10/20/all); fixtures/domain/session-builder.json.
F1.5: src/domain/session-queue.ts immutable queue (entries with attempt number, Not yet inserted after REQUEUE_GAP others or appended, cap REQUEUE_MAX_PER_SESSION, history stack so undo restores exact queue and position to the start, done/current/remaining counts); fixtures/domain/session-queue.json.
F1.6: src/domain/csv-import.ts parseCsv (Papa Parse; block/error/warning issues with row numbers, header = row 1), deriveCardId, bulletLines; fixtures/csv/ has one broken file per rule; papaparse and @types/papaparse added.
F1.7: zip safety (central-directory symlink check, entry and size limits) and image checks (bytes sniffing, header dimensions, sha256, storage key) in src/domain/zip-import.ts and image-check.ts; added fflate and file-type.
F1.8: src/domain/stats.ts statsWindows (Monday-aligned week/four weeks plus previous period), windowMetrics, practiceBars, changeInWords, masteryBuckets, focusNext, sortByLowestMastery; fixtures/domain/stats.json hand-computed across the October clock change and day-start boundaries.
- 2026-11-01: F1 Domain core DONE. PR #5 merged into develop (merge 1528431). Reviewer PASS; verify green (453 tests); e2e and axe not applicable.
F2.1: getCurrentProfile (header over cookie, 401 ApiError), ApiError/toErrorResponse, tests/factories.ts, source scan test.
- F2.2: profile API (GET /profiles, POST /session/profile, GET /me), shared profile schemas and typed client in src/ui/api/client.ts; integration test in tests/profile-api.test.ts.
F2.3: GET /library (decks with cardCount) and GET /decks/{id} (topics with counts), scoped by owner; due and mastery counts left to F4.
F2.4: profile picker at / (src/ui/profile, src/ui/avatars), resolveHome redirect logic, e2e in e2e/profile-picker.spec.ts; e2e server seeds profiles.
F2.5: app shell (src/app/(app)/layout, src/ui/shell/Sidebar, src/ui/states), stub pages /library /decks/[id] /progress /settings, e2e/app-shell.spec.ts.
F2.6: e2e/profiles.spec.ts closes AC1 (pick, isolation, 404 by URL and API, switch, axe and 44 px); scripts/e2e-seed.ts adds one deck per profile for e2e.
REVIEW F2 round 1: GAPS at 4fcc11a
F2.7: src/app/error.tsx root boundary (ErrorState with Retry and Switch profile) for (app) layout and / failures; src/app/error.test.ts.
F2.8: picker loading state uses Skeleton cards in role=status aria-label Loading; e2e matches the label.
REVIEW F2 round 2: PASS at 417b68c
F2 done (PR #7). MANUAL PENDING: none
F3.1: ImageStore interface, disk driver (rejects keys escaping IMAGE_STORE_PATH), getImageStore by IMAGE_STORE_DRIVER; one contract suite per driver in tests/contract.
F3.2: GET /api/v1/images/{id} streams owner images with nosniff, immutable cache, ETag and 304; others 404. Test in tests/images-api.test.ts.
- F3.3: POST /imports?dryRun=true previews CSV or zip (columns, counts, first three cards, issues with rows); integration test checks no rows or files are written.
- F3.4: commitImport saves deck, images, cards and import run in one transaction; shared parseImport with the dry run; tests/imports-commit.test.ts covers rollback, dedupe and per-profile images.
- F3.5: re-import via deckId in commitImport (match by id, update changed cards only, add new, list missing); progress rows untouched; tests/imports-reimport.test.ts with createReviewLog factory.
- F3.6: GET /imports/template (CSV) and GET /decks/{id}/export (deck.csv plus images/ named by hash); tests/export-api.test.ts round-trips to unchanged.
- F3.7: pnpm import:cli <file> --profile <name> [--name --group --color --answer-style --deck] calls commitImport and prints the result JSON; unknown profile exits 1. ApiError lost parameter properties so Node type stripping can load it. Test in tests/import-cli.test.ts.
- F3.8: moved school fixtures from res/ to fixtures/, added fixtures/multi-point.csv (6 System Design cards); tests/integration/school-deck.test.ts proves 16 cards, 4 topics, 7 images served byte-for-byte.
- F3.9: /import screen (src/ui/import): browser parse and preview with the shared domain import-file, deck form or existing deck (?deckId= preselects), commit to /imports, success and blocked/loading/error states; tests in src/ui/import/import.test.ts.
F3.10: e2e/import.spec.ts drives the import screen end to end on desktop and iPad (school zip, unchanged re-import, edited back, broken CSV, blocked file) with axe and 44 px checks in both themes. 44 px helper now skips a visually hidden file input inside a label.
REVIEW F3 round 1: GAPS at 9181fc6
F3.11: parseImportFile now emits one missing_image warning per referencing row for CSV-only uploads, and zip image warnings carry each row; tests in src/domain/import-file.test.ts. Preview already printed Row N.
F3.12: ImportSuccess shows added, updated and unchanged counts, the kept missing ids and commit warnings (card_not_in_file filtered out as it duplicates the missing list); test in src/ui/import/import.test.ts.
F3.13: import screen follows add_deck_re_import: numbered steps, Deck details beside the preview, colour swatches, segmented answer style, Topic/Front/Back table, Add N cards; e2e and axe pass on both viewports and themes.
REVIEW F3 round 2: PASS at f56ff1c
F3 done (PR #8). MANUAL PENDING: none
- F4.1: GET /library now returns today's totals and grouped decks with due and mastery counts (tests/library-counts.test.ts).
- F4.2: GET/PATCH/DELETE /decks/{id} and GET /decks/{id}/leeches; topics carry due, buckets and mastered percent, deck carries cardCount and reviewCount (tests/deck-manage-api.test.ts).
- F4.3: Library page (Today panel, grouped decks, mastery bar with counts, skeleton and Retry); Start practice and Weak cards PUT /sessions/{uuid} and open the /practice/{id} stub (src/ui/library, e2e/library.spec.ts).
- F4.4: Library search (deck and topic names, case and accent blind via src/domain/text-match.ts), neutral no-match line, and a single-action empty state (src/ui/library/library-view.test.ts).
- F4.5: Deck page lists topics with counts, mastery bar and mastered percent; tick topics to scope Practise (label states topics and due) and practise-anyway for topics with nothing due (src/ui/deck, e2e/deck.spec.ts).
- F4.6: Deck page has Edit deck (PATCH), Delete deck (confirmation with card and review record counts, then Library), Re-import link (/import?deckId=) and a Needs rewording list of leeches (src/ui/deck/*, e2e/deck.spec.ts).
- F4.7: Library e2e covers loading, error with Retry, empty, populated and search; Deck e2e adds edit panel, delete confirmation (DELETE mocked) and not-found, all with axe and 44 px in both themes (e2e/library.spec.ts, e2e/deck.spec.ts).
REVIEW F4 round 1: GAPS at 3eb9d84
- F4.8: Start practice and Practise deck enable on candidates = due + New up to the remaining daily cap (domain sessionCandidateCount); library today.startableCount and deck.newRemaining added (tests/library-counts.test.ts, practice-plan test).
- F4.9: Deck e2e covers the loading skeleton (client navigation held open) and the error with Retry (stream's page row swapped for an error row), with axe and 44 px in both themes (e2e/deck.spec.ts).
REVIEW F4 round 2: PASS at 31f9481
F4 done: PR #9. MANUAL PENDING: none
- F5.1: GET/PUT /api/v1/settings (src/server/settings.ts); PUT replaces all settings with strict validation; tests in tests/settings-api.test.ts.
- F5.2: SettingsProvider and sidebar theme switch apply and save the theme at once; root layout renders the profile's theme (src/ui/settings/*, e2e/theme.spec.ts).
- F5.3: Reading settings with live preview (font, size, spacing, card colour, reset) at /settings; shared ReadingCard and --on-card-* tokens (src/ui/reading-card, src/ui/settings/reading).
- F5.4: Practice settings (session length, new cards per day with validation, read aloud, reading speed) on /settings (src/ui/settings/practice).
- F5.5: e2e/settings.spec.ts covers live preview, persistence (reload, new context, second server), theme toggle per screen, axe and 44 px on Settings in both themes, on desktop and iPad.
REVIEW F5 round 1: GAPS at 5fc8d5a
- F5 review fix: settings saves now serialized in order with a rollback guard (src/ui/settings/saver.ts). Each queued save sends the latest settings when it runs; a failed save rolls back only if no newer change exists.
REVIEW F5 round 2: GAPS at c7361a1
REVIEW F5 round 3: PASS at 0fd2cbf
F5 done: PR #10. MANUAL PENDING: none
- F6.1: PUT /api/v1/sessions/{id} builds the queue (src/server/sessions.ts) for every scope and length, stores the ordered card ids in sessions.meta, and returns card text, images, grade labels and grades so far; an empty body resumes (tests/sessions-api.test.ts, AC7 cap).
- F6.2: PUT /api/v1/reviews/{id} records a grade in one transaction (src/server/reviews.ts): scheduler, card_state upsert, complete review_log (prev_state, first attempt, introduced_new), re-queue at most twice, idempotent retry (tests/reviews-api.test.ts).
- F6.3: DELETE /api/v1/reviews/{id} undoes the latest live grade of a session (src/server/reviews.ts): restores card_state from prev_state or removes it for a New card, marks undone_at, keeps the row, returns the restored state and labels; repeat-safe (tests/reviews-undo.test.ts).
- F6.4: POST /api/v1/sessions/{id}/end and GET /api/v1/sessions/{id}/summary (src/server/sessions.ts); the last grade marks the session completed (src/server/reviews.ts) (tests/sessions-end-summary.test.ts).
- F6.5: full-screen practice front and back views with segmented progress, reading settings, skeleton and error state (src/ui/practice, src/app/practice/[sessionId]); grading is F6.6.
- F6.6: grade buttons, Not yet re-queue, Undo last, End session and resume in the practice screen (src/ui/practice/use-session.ts controller over domain/session-queue, GradeBar.tsx; tests with a mocked clock and API).
F6.7: session summary (counts, time, go-again cards, Practise the misses via cards scope, Back to Library) shown from PracticeScreen.
