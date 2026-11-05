# ADR-001: Layer boundaries and shared helpers are enforced by lint

- **Status:** Accepted
- **Date:** 2026-11-05
- **Decision owner:** Davi

## Context

PRD section 9 and `CLAUDE.md` define the layers (`app`, `server`, `domain`, `shared`, `ui`), but only `domain` was checked by a tool. The audit [AUD-20261105-over-engineering](../audits/2026-11-05-over-engineering.md) found the usual result of prose-only rules: the UUID pattern written six times (OE-01), and a route that reached into the database (`api/v1/health`). Agents copy the code they find, so one drifted copy becomes the next feature's template.

## Options considered

1. **Keep the rules in `CLAUDE.md` and the reviewer's checklist.** Free, but it relies on a review catching it, once per feature.
2. **ESLint `no-restricted-imports` per layer, plus `no-restricted-syntax` for a shared rule.** No new dependency; fails `pnpm lint` and so `scripts/verify.sh`, the Stop hook and CI.
3. **A dependency-graph tool (dependency-cruiser, knip).** More expressive, but a new dependency, which `CLAUDE.md` says to ask about first.

## Decision

Option 2. `eslint.config.mjs` holds one import-restriction block per layer:

| Layer | May not import |
| --- | --- |
| `src/app` | the database (`drizzle-orm`, `postgres`, `@/server/db/**`) |
| `src/server` | `@/ui`, `@/app` |
| `src/domain` | `@/server`, `@/ui`, `@/app`, database modules, Node I/O |
| `src/shared` | `@/server`, `@/ui`, `@/app`, `@/domain`, database modules |
| `src/ui` | `@/server`, `@/app`, database modules |

Test files are exempt. `isUuid` in `src/shared/uuid.ts` is the only place the UUID pattern is written; the lint rule bans the literal elsewhere in `src/`. `reportUnusedDisableDirectives` is an error, so a suppression that no longer suppresses anything is removed.

## Enforcement

`pnpm lint`, inside `scripts/verify.sh`. `pnpm format:check` is in the same script. The milestone checkpoint (`/review-milestone`) re-proves that a deliberate violation still fails.

## Consequences

- Easier: a wrong import fails the build with a message naming the layer rule.
- Harder: a legitimate new dependency direction needs a config change and a superseding ADR, which is the point.
- Not covered: duplication of non-pattern code (OE-02 to OE-04) and unused exports (OE-17). These need a tool (jscpd, knip) or the reviewer, and stay open until the owner decides on the dependency.

## Weakest assumption

That path-based rules are enough while the app has one feature area per layer. If layers grow sub-areas that need their own rules, revisit option 3.
