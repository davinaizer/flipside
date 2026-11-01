# Implementation decisions

Product decisions live in docs/PRD.md section 18. This file holds what happens while building.

- `ASSUMED: <what, why>` is logged by a worker that took a PRD-stated default. The user reviews these in the PR.
- `ANSWER (<task id>): <question> -> <answer>` records what the user decided when a worker was blocked.

ANSWER (F0.3): Which container runtime? -> Podman instead of Docker (PRD D20). `podman compose` needs a separately installed provider, so scripts call `podman run` directly.
ANSWER (F3.8): Where is the school deck? -> Supplied in `res/`; its zip keeps images under `images/` while the CSV names bare files, so image names match by base file name.
ASSUMED: settings ids (atkinson, lexend, system; textSize 1-4, spacing 1-3, default card colour mist) and newCardsPerDay max 100, since the PRD names options without ids.
ASSUMED: container user/db/password flipside/flipside/flipside (local-only, 127.0.0.1 bound), container removed on db:down while the named volume stays.
ASSUMED: integration tests read the server version via podman exec psql, since the Postgres driver arrives in F0.5 and none is allowed yet; container name is flipside-test-<pid>-<random>, port from a free-port probe.
ASSUMED: Postgres driver is `postgres` (postgres-js) with drizzle-orm/drizzle-kit; enums are checked text columns; box range 1-5 checked on card_state and review_log; migration journal lives in public.schema_migrations; sessions and review_log ids are client-supplied (no default).
ASSUMED: pnpm db:migrate uses drizzle-kit migrate (no new dependency); start-up migration runs from src/instrumentation.ts via the same drizzle migrator.
ASSUMED: seed matches profiles by name and only inserts missing ones; placeholder avatars fox/owl, accent stored as "primary" (design primary token), seed script runs under plain Node 26 type stripping with a resolve hook for the "@/" alias since tsx is not a dependency.
ASSUMED: box tokens are derived from design palette (Not yet peach #ffdcc4 on #6f3800, Nearly buttercream #fef9c3 on darkened #5c4700, dark Nearly #463c00 on #fff1a8, dark Not yet #4f2500 on #ffdcc5) to reach 4.5:1 (README item 9); tokens use short semantic names (surface, on-surface, box-got-it) via Tailwind v4 @theme in CSS, no tailwind config file; on-primary-container light set to #ffffff for contrast.
ASSUMED: font id stays `system` (shipped in F0.2) instead of `system-sans`; src/ui/font-ids.ts maps it to the system stack. Fonts are the OFL variable TTFs from the googlefonts GitHub repos, committed in src/ui/fonts/.
ASSUMED: e2e uses @playwright/test and @axe-core/playwright (PRD section 9 test stack); webServer runs scripts/e2e-server.mjs (throwaway Podman Postgres, next build + start on port 3100, E2E_PORT overrides) with a detached watchdog removing the container if Playwright kills it; both projects use Chromium, iPad is 1180x820 with touch; run `pnpm exec playwright install chromium` once.
