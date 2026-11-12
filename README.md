# Flipside

Flipside schedules flashcard reviews with a boxed (Leitner) system: a card you know moves up a box and comes back less often, a card you miss comes back the same day. It keeps the method behind Anki, in an interface built for young learners, with reading settings (font, size, spacing, card colour) the learner controls.

> **Status: v0.7.0.** The MVP web app is built and in use. It runs on Vercel, you sign in with an email and password, and it installs to the Home Screen of an iPad or iPhone. That completes the phase 2 build; what remains of phase 2 is two weeks of hosted use. The product requirements are in [docs/PRD.md](docs/PRD.md).

## Who it is for

| Profile | Use |
| --- | --- |
| Student | School subjects and exam preparation, mostly on an iPad |
| Engineer | System Design and other engineering topics for interview prep |

You sign in once per device with an account's email and password; then a profile is picked from a Netflix-style picker. An account owns its profiles, and each profile keeps its own decks, progress and settings.

## What it does

- Email and password accounts that own profiles: sign-in limited to 5 failed attempts per email in 15 minutes, sign-out, and Change password on the Profile page. Accounts are created from the command line; there is no sign-up screen.
- Profile picker with Add User, and a Profile page; decks, progress and settings are separate per profile, and nothing is shared across accounts.
- Library of decks with today's due count and a deck menu; deck pages with topic selection.
- Practice sessions: flip, grade (Not yet, Nearly, Got it), undo, read-aloud, summary.
- Scheduler: five boxes; only Got it moves a card up; missed cards return within the session; a daily cap on new cards; cards that keep failing are flagged for rewording.
- CSV import (with a zip of images), with preview, validation and updates that keep progress. Web imports and images are limited to 4 MB; `pnpm import:cli` imports larger zips.
- Progress screen: cards practised, Got it rate, time per card, days practised, by-deck table.
- Settings per profile, a light and dark theme, and a collapsible sidebar.
- Installed web app: add Flipside to the Home Screen from Safari (Share, Add to Home Screen) and it opens standalone, with its own icon and content kept clear of the notch and home indicator. Every screen works at phone width (375 px); below 640 px the sidebar starts as an icon rail and opens over the page.

Not built: offline use (there is no service worker), notifications, an in-app card editor, password reset by email, final app icon artwork (the icon is a placeholder letter F), voice and LLM features.

## Tech stack

| Layer | Choice |
| --- | --- |
| App | Next.js (App Router) with Route Handlers, TypeScript |
| Database | Postgres 17: Podman locally, Neon when hosted. Drizzle ORM |
| Validation | Zod schemas shared by UI and API |
| Images | `ImageStore` interface: disk driver locally, private Vercel Blob store when hosted |
| Hosting | Vercel Hobby, production deploys only from version tags |
| Tests | Vitest, Playwright, axe |
| Package manager | pnpm |

## Repository layout

```text
docs/        PRD, glossary, ADRs, design, operations, the feature ledger
src/app      pages and Route Handlers (/api/v1)
src/server   services: decks, imports, sessions, stats, image store
src/domain   pure functions: scheduler, session builder, import rules
src/shared   Zod schemas and constants
src/ui       components and design tokens
drizzle/     migrations
scripts/     verify, seed, backup, restore, import CLI, account CLI
e2e/         Playwright tests
fixtures/    test decks
ops/         launchd templates for running at home
```

## Local development

Specified in [PRD section 13](docs/PRD.md#13-local-environment-and-operations). Copy `.env.example` to `.env` first. Local development uses Podman Postgres and the disk image driver, whatever runs in production.

| Command | Purpose |
| --- | --- |
| `pnpm db:up` / `pnpm db:down` | Start or stop Postgres in Podman |
| `pnpm db:migrate` / `pnpm db:seed` | Apply migrations, create the two profiles and a development account from `DEV_ACCOUNT_EMAIL` and `DEV_ACCOUNT_PASSWORD` in `.env` |
| `pnpm account:create <email> [--adopt-profiles]` / `pnpm account:password <email>` | Create an account (optionally taking every profile that has none), or set a new password and sign the account out everywhere |
| `pnpm dev` | Development server. Open it from this Mac only: Next's dev server refuses its scripts to other devices, so a tablet shows a page that never loads |
| `pnpm build` then `pnpm start` | Production server on the home network. Use this for the iPad, iPhone or any other device; sign-in works over plain http on the network address (the sign-in cookie is Secure only over https) |
| `bash scripts/verify.sh` | Typecheck, lint and tests; must be green before a commit |
| `pnpm test` / `pnpm test:e2e` | Unit and integration tests, end-to-end tests |
| `pnpm import:cli <zip> --profile <name> --name <deck>` | Import a deck from the command line, including zips over the 4 MB web limit |
| `pnpm backup` / `pnpm restore <folder>` | Back up and restore the database and images. Set `IMAGE_STORE_PATH` in the shell if images are not in `./data/images`: these scripts do not read `.env` |

## Checks on pull requests

`.github/workflows/checks.yml` runs `scripts/verify.sh` and the Playwright e2e suite on every pull request into `main`, against the merged result. Branch protection on `main` requires both checks before a merge.

## Hosting and releases

The hosted app runs on Vercel's Hobby plan with Neon Postgres and a private Vercel Blob store ([ADR-002](docs/adr/002-host-on-vercel.md)). Merging to `main` deploys nothing. To release, tag a commit on `main` and push the tag:

```bash
git tag vX.Y.Z && git push origin vX.Y.Z
```

`.github/workflows/release.yml` checks the tag is on `main` and moves the `release` branch to it; Vercel deploys `release` only, and its build runs the migrations before `next build`. After the first release with accounts, create the first account against the hosted database with `pnpm account:create <email> --adopt-profiles`; until then nobody can sign in. Keep the version in `package.json` in step with the tag, since the footer stamp reads it. Setup, releasing, rolling back and importing into the hosted app are in [docs/operations.md](docs/operations.md).

## Running at home

Launchd templates for the app, Postgres and the nightly backup are in `ops/launchd/`. Install steps, the iPad address and shortcut, and the reboot and restore checklist are in [docs/operations.md](docs/operations.md).

## Roadmap

| Phase | Name | Gate to move on |
| --- | --- | --- |
| 1 | MVP: web app, local | Acceptance criteria pass; four weeks of real use |
| 1.5 | Extras: confidence tap, per-point reveal, test-date cram mode | None: can run before or after phase 2 |
| 2 | Hosted web app (v0.6, v0.7): Vercel, email accounts, installable web app | AC27 to AC34 pass; two weeks of hosted use within the free tiers |
| 2.5 | Web Push reminders (optional) | Usage shows reminders are worth building |
| 3 | Experiment: spoken answers with LLM feedback, randomised | LLM grading agrees with hand grading in a recorded test |

The SwiftUI app is no longer planned (PRD decision D31). Details and gates are in [PRD section 3](docs/PRD.md#3-scope-and-phases).

## Documentation

- [Product requirements (PRD)](docs/PRD.md): scope, requirements, learning model, import format, statistics, architecture, data model, API, testing, risks and the decision log.
- [Glossary](docs/GLOSSARY.md): the terms used in code, docs and UI copy.
- [Architecture decisions](docs/adr/) and [operations](docs/operations.md): hosting, releases, running at home, backups.
- [How the app is built](docs/WORKFLOW.md): the agent workflow and feature ledger.
- Design reference: the Stitch exports and the light and dark design files in [docs/design/](docs/design/README.md). The screens are reference only; the PRD and that README say where they differ.

## First fixture

The first test deck is a small science deck: 16 cards, four topics and seven images (diagrams drawn for this repository). It is in `fixtures/` (`science-w2.csv` and `science-w2-deck.zip`).

## Licence

[MIT](LICENSE).
