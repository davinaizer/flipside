---
name: plan-backlog
description: Break each feature in docs/features.json into commit-sized tasks for the user to review once before building starts.
disable-model-invocation: true
---
Fill the empty `tasks` arrays in `docs/features.json`, in dependency order. For each feature read only its `prd_sections`.

Each task: `id` (F3.1), `title`, `reqs`, `prd_sections`, `area` (paths or layer), `done_when` (a test to write or a check that proves it), `status: "todo"`. Add `"model": "opus"` only for domain-heavy work (scheduler, undo, day boundary, re-import, statistics). Each task must leave `bash scripts/verify.sh` green and be one commit.

F0 must cover: package.json with scripts `typecheck`, `lint`, `test` (self-contained, starts its own test database) and `test:e2e`; Docker Postgres with `db:up` and `db:down`; the Drizzle schema for all of PRD section 10; migrations on start, health endpoint and seed script for two profiles; Tailwind with one tokens file built from docs/design/DESIGN.md and DESIGN-DARK.md (same semantic names in both themes, switched by a theme attribute), plus bundled Lexend and Atkinson Hyperlegible Next via next/font (N5); a constants file in `src/shared` (day start hour 07:00, intervals, caps); Playwright with desktop and iPad viewports plus axe; `.gitignore` covering `.DS_Store`, `.env*`, `data/`, `CLAUDE.local.md` and `.claude/settings.local.json`; the command list in CLAUDE.md.

When done, stop and show a one-screen summary per feature (task count, tasks marked opus) for the user to review. Do not start building.
