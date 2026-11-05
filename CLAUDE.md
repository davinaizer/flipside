# Flipside

Flashcard web app for school revision. Next.js (App Router), TypeScript strict, Postgres 17 + Drizzle, Tailwind, Vitest, Playwright, pnpm.
Spec: `docs/PRD.md` (authoritative). How agents build it: `docs/WORKFLOW.md`. Build features with `/run-feature`, not ad hoc.

## Commands
- `bash scripts/verify.sh`: typecheck, lint, tests. Must be green before any commit.
- `pnpm dev`: dev server on port 3000. `pnpm build`, then `pnpm start`: production server.
- `pnpm db:up` / `pnpm db:down`: start/stop local Postgres 17 (Podman; volume kept). First time: `cp .env.example .env` (`dev` and `start` read `.env`, and fail without `DATABASE_URL`).
- `pnpm db:migrate`: apply migrations (needs `DATABASE_URL` exported, e.g. `set -a; . ./.env.example`). `pnpm db:seed`: seed the two profiles.
- `pnpm test`: Vitest. `pnpm test:e2e`: Playwright desktop and iPad with axe (boots its own Postgres and app; run `pnpm exec playwright install chromium` once).

## Rules
- Layers (PRD section 9): `src/app` parses input and calls a service, no business logic; `src/server` services; `src/domain` pure functions, no I/O; `src/shared` Zod schemas and constants; `src/ui` components and design tokens.
- The API is the contract: no Server Actions for domain operations (N1).
- Tunable values (day start hour, intervals, caps) live in `src/shared` constants.
- The layer rules are enforced by lint (`eslint.config.mjs`, ADR-001): a failing import is a rule violation, not a style issue. `isUuid` in `src/shared/uuid.ts` is the one UUID check; do not write the pattern again.
- Suppressions are local, temporary and explained at the point of use (`// eslint-disable-next-line <rule> -- why`). No file-wide or config-wide disables, and do not widen ignore lists to hide a failure. An unused suppression fails lint.
- Look and feel: `docs/design/DESIGN.md` (light) and `DESIGN-DARK.md` (dark) are canonical. Use the tokens file and existing components; screens are reference only: build from the PRD, use the screen for layout, and apply the corrections in `docs/design/README.md` (never copy `code.html`). Semantic tokens only, no raw hex. Every screen works in both themes.
- No dependency, service, queue or cache outside PRD section 9 without asking.
- Never edit PRD acceptance criteria. In `docs/features.json` change only `status`, `commit`, `branch`, `pr`.

## Engineering principles
The PRD decides what to build; these decide how. When they pull apart, take fewer moving parts and lower cognitive load.
- KISS: the simplest code that meets the acceptance criterion.
- YAGNI: build only what a requirement asks for now. Items the PRD reserves for later stay unbuilt. Add no abstraction, system or rule before recurring evidence shows the need.
- SOLID where it fits: one responsibility per module, and depend on an interface only at a real boundary, such as `ImageStore` or `getCurrentProfile`. Do not add a class or a single-implementation interface to satisfy it.
- DRY for rules, not for shapes: a domain rule or constant lives in one place; wait for a real repeat before abstracting similar-looking code.
- Maintainability: leave enough context to debug and safely change the code later. Explain a non-obvious why where it matters.
- Acceptance evidence: looking right or passing a check is not enough on its own. Run verification proportionate to the change, and report the assumptions made and any risk it did not cover.
- Conventional Commits: `<type>(<task id>): <imperative summary>`, for example `feat(F3.5): keep progress on re-import`. Types: feat, fix, refactor, test, docs, chore. One task, one commit.

## Where things live
Every durable concept has one owner. Define it there; elsewhere summarise and link.

| Need | Owner |
| --- | --- |
| What to build, acceptance criteria | `docs/PRD.md` |
| How agents build it | `docs/WORKFLOW.md`, `.claude/skills/`, `.claude/agents/` |
| Why a structural decision was made | `docs/adr/` (index in its README) |
| Assumptions and answers while building | `docs/decisions.md` |
| Review findings and the standard for them | `docs/audits/` |
| Look and feel | `docs/design/` |
| Checks | `scripts/verify.sh` (CI and the Stop hook call it) |

When two documents disagree: PRD, then this file, then accepted ADRs, then `docs/decisions.md`, then the code. Surface the conflict instead of picking a lower one.

After a group of features, run `/review-milestone` in a fresh session. A review or audit finding that recurs becomes a lint rule or a reviewer check (`docs/audits/README.md`).

## Stop rules
Workers report `STATUS: BLOCKED`; the orchestrator asks the user. Stop only when:
1. The PRD is ambiguous or contradicts itself on the point at hand.
2. The task needs a deviation from a requirement or acceptance criterion.
3. It needs a new dependency, service or schema change outside PRD section 10.
4. A check still fails after two fix attempts.
5. The action is destructive or irreversible.

Anything else: take the PRD-stated default, log it in `docs/decisions.md` as ASSUMED, and continue. An open question with an assumed default (PRD section 17) is not a reason to stop.
