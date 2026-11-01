# Progress

Append-only. One to three lines per task or event: date, task id, what, commit. Read the tail at session start.

- 2026-11-01: workflow scaffolded (docs/WORKFLOW.md, agents, skills, ledger). No code yet.
- 2026-11-01: F0.1 scaffolded Next.js, TS strict, ESLint (domain boundary rule), Prettier, Vitest, src layers.
F0.2: shared constants, enums, settings schema (Zod added per PRD section 9) and uuidv7 in src/shared.
F0.3: scripts/db.sh (podman run, named volume, idempotent), .env.example, zod env parsing in src/server/env.ts.
F0.4: vitest global setup starts a disposable tmpfs Postgres 17 via podman, removed on exit.
F0.5: Drizzle schema for all nine section 10 tables, migration 0000, postgres-js client, schema introspection test.
