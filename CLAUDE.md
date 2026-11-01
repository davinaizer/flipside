# Flipside

Flashcard web app for school revision. Next.js (App Router), TypeScript strict, Postgres 17 + Drizzle, Tailwind, Vitest, Playwright, pnpm.
Spec: `docs/PRD.md` (authoritative). How agents build it: `docs/WORKFLOW.md`. Build features with `/run-feature`, not ad hoc.

## Commands
- `bash scripts/verify.sh`: typecheck, lint, tests. Must be green before any commit.
- Feature F0 adds the rest (dev server, db up/down, e2e) and lists them here.

## Rules
- Layers (PRD section 9): `src/app` parses input and calls a service, no business logic; `src/server` services; `src/domain` pure functions, no I/O; `src/shared` Zod schemas and constants; `src/ui` components and design tokens.
- The API is the contract: no Server Actions for domain operations (N1).
- Tunable values (day start hour, intervals, caps) live in `src/shared` constants.
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

## Stop rules
Workers report `STATUS: BLOCKED`; the orchestrator asks the user. Stop only when:
1. The PRD is ambiguous or contradicts itself on the point at hand.
2. The task needs a deviation from a requirement or acceptance criterion.
3. It needs a new dependency, service or schema change outside PRD section 10.
4. A check still fails after two fix attempts.
5. The action is destructive or irreversible.

Anything else: take the PRD-stated default, log it in `docs/decisions.md` as ASSUMED, and continue. An open question with an assumed default (PRD section 17) is not a reason to stop.
