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
