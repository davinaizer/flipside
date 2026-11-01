# Flipside

Flashcard web app for school revision. Next.js (App Router), TypeScript strict, Postgres 17 + Drizzle, Tailwind, Vitest, Playwright, pnpm.
Spec: `docs/PRD.md` (authoritative). How agents build it: `docs/WORKFLOW.md`. Build features with `/run-feature`, not ad hoc.

## Commands
- `bash scripts/verify.sh`: typecheck, lint, tests. Must be green before any commit.
- `pnpm dev`: dev server on port 3000. `pnpm build`, then `pnpm start`: production server.
- `pnpm db:up` / `pnpm db:down`: start/stop local Postgres 17 (Podman; volume kept). First time: `cp .env.example .env` (`dev` and `start` read `.env`, and fail without `DATABASE_URL`).
- `pnpm db:migrate`: apply migrations (needs `DATABASE_URL` exported, e.g. `set -a; . ./.env.example`). `pnpm db:seed`: seed Davi and Nicole.
- `pnpm test`: Vitest. `pnpm test:e2e`: Playwright desktop and iPad with axe (boots its own Postgres and app; run `pnpm exec playwright install chromium` once).

## Rules
- Layers (PRD section 9): `src/app` parses input and calls a service, no business logic; `src/server` services; `src/domain` pure functions, no I/O; `src/shared` Zod schemas and constants; `src/ui` components and design tokens.
- The API is the contract: no Server Actions for domain operations (N1).
- Tunable values (day start hour, intervals, caps) live in `src/shared` constants.
- Look and feel: `docs/design/DESIGN.md` (light) and `DESIGN-DARK.md` (dark) are canonical. Use the tokens file and existing components; screens are reference only: build from the PRD, use the screen for layout, and apply the corrections in `docs/design/README.md` (never copy `code.html`). Semantic tokens only, no raw hex. Every screen works in both themes.
- No dependency, service, queue or cache outside PRD section 9 without asking.
- Never edit PRD acceptance criteria. In `docs/features.json` change only `status`, `commit`, `branch`, `pr`.

## Stop rules
Workers report `STATUS: BLOCKED`; the orchestrator asks the user. Stop only when:
1. The PRD is ambiguous or contradicts itself on the point at hand.
2. The task needs a deviation from a requirement or acceptance criterion.
3. It needs a new dependency, service or schema change outside PRD section 10.
4. A check still fails after two fix attempts.
5. The action is destructive or irreversible.

Anything else: take the PRD-stated default, log it in `docs/decisions.md` as ASSUMED, and continue. An open question with an assumed default (PRD section 17) is not a reason to stop.
