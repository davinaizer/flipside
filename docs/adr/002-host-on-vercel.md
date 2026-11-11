# ADR-002: Host on Vercel Hobby with Neon and Vercel Blob

- **Status:** Proposed
- **Date:** 2026-11-11
- **Decision owner:** Davi

## Context

Flipside ran only on a Mac Mini on the home network (D4). The owner now wants it reachable from anywhere, on free hosting tiers, as an installable web app instead of a SwiftUI app (PRD v0.6, D29 to D34).

Facts, checked against the providers' pages on 2026-11-11:

- The app is one Next.js 16 application with Route Handlers, `src/proxy.ts`, Postgres through Drizzle and `postgres`, and images behind an `ImageStore` interface with a disk driver.
- Serverless hosts have no lasting disk, run several short-lived instances, and limit request bodies.
- Vercel Hobby: personal, non-commercial use; no charge per deploy; 300 s function limit; 4.5 MB request body limit; when an allotment runs out, that feature stops until it resets. Neon comes from the Vercel Marketplace and sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED`.
- Netlify free (credit-based): 15 of 300 monthly credits per production deploy; at zero credits every project on the team is paused. The owner has another project on Netlify.
- Cloudflare Workers free: 10 ms of CPU per request and a 3 MB compressed bundle.

Assumptions: a household's traffic, storage and compute fit Vercel Hobby, Neon free and Vercel Blob's Hobby allotment.

## Options considered

1. **Vercel Hobby, Neon, Vercel Blob.** Best Next.js support and nothing charged per deploy. Ties images to a Vercel API, and has the same 4.5 MB request limit as the others.
2. **Netlify free, Netlify Database, Netlify Blobs.** Familiar to the owner and one vendor. Every production deploy costs credits, and running out pauses the owner's other project too.
3. **Cloudflare Workers, Hyperdrive, R2, Cloudflare Access.** R2 and Access are excellent, but the free CPU limit is below what scrypt and imports need, so it needs the paid plan.
4. **Mac Mini behind Cloudflare Tunnel.** No code changes, but uptime depends on the home network.

## Decision

Option 1. Concretely:

- Production deploys come only from the `release` branch, which a GitHub Actions workflow moves to each `v*` tag; `vercel.json` sets `git.deploymentEnabled` to `{"*": false, "release": true}` (H3).
- The hosted build runs `drizzle-kit migrate` against `DATABASE_URL_UNPOOLED` before `next build`; the runtime uses the pooled `DATABASE_URL` with `max: 1` (H1, H2).
- A `vercel-blob` `ImageStore` driver writes to a private store. Reads keep going through `GET /images/{id}`, so the ownership check is unchanged (H4).
- Image and web import limits drop to 4 MB; larger imports use `import:cli` (H5).
- Local development keeps Podman Postgres, migrations on start and the disk driver, so tests and e2e run as before.

The PRD's earlier objection to Vercel Blob (a proprietary API, section 12) costs little here: every read already goes through our route, and the lock-in is one small driver behind `ImageStore`.

## Enforcement

- The `ImageStore` contract tests run against the disk driver and the Vercel Blob driver (with the SDK mocked in CI; one manual run against a real store).
- `vercel.json` is in the repository, so a change to deploy branches shows in review.
- `src/server/env.ts` validates `IMAGE_STORE_DRIVER` and the variables each driver needs at start.
- AC32 and AC33 are checked by hand on the production deploy.

## Consequences

- Easier: HTTPS, no server to run, installable web app, rollback from the Vercel dashboard.
- Harder: two runtimes to keep working (local and hosted); hosted logs are kept for one hour on Hobby; no scheduled backup of hosted data in v0.6.
- Risk accepted: if a free allotment runs out, part of the app stops until it resets (PRD R11). Paid fallbacks exist without code changes: Vercel Pro, Neon Launch, or R2 through a new driver.

## Weakest assumption

That usage stays inside the free allotments, especially Neon's compute hours and Vercel's function and data-transfer allotments. Evidence that would change this: the weekly usage check in the first month trending above about half of any allotment. Then compare Vercel Pro with moving the database or images.
