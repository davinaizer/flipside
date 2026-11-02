# Flipside

Flipside schedules flashcard reviews with a boxed (Leitner) system: a card you know moves up a box and comes back less often, a card you miss comes back the same day. It keeps the method behind Anki, in an interface built for young learners, with reading settings (font, size, spacing, card colour) the learner controls.

> **Status: v0.1.0 (MVP).** The Phase 1 web app is built and in use. The product requirements are in [docs/PRD.md](docs/PRD.md).

## Who it is for

| Profile | Use |
| --- | --- |
| Student | School subjects and exam preparation, mostly on an iPad |
| Engineer | System Design and other engineering topics for interview prep |

Profiles are picked from a Netflix-style screen. There is no login in the MVP.

## MVP at a glance

- Profile picker; decks, progress and settings are separate per profile.
- Library of decks with today's due count, deck pages with topic selection.
- Practice sessions: flip, grade (Not yet, Nearly, Got it), undo, read-aloud, summary.
- Scheduler: five boxes; only Got it moves a card up; missed cards return within the session; a daily cap on new cards; cards that keep failing are flagged for rewording.
- CSV import (with a zip of images), with preview, validation and updates that keep progress.
- Progress screen: cards practised, Got it rate, time per card, days practised, by-deck table.
- Local only: Podman Postgres, backups, no third-party requests.

Out of scope for the MVP: deployment, authentication, offline use, notifications, an in-app card editor, voice and LLM features.

## Tech stack

| Layer | Choice |
| --- | --- |
| App | Next.js (App Router) with Route Handlers, TypeScript |
| Database | Postgres 17 in Podman, Drizzle ORM |
| Validation | Zod schemas shared by UI and API |
| Images | `ImageStore` interface: disk driver now, S3-compatible (for example Cloudflare R2) later |
| Tests | Vitest, Playwright, axe |
| Package manager | pnpm |

## Repository layout (planned)

```text
docs/        PRD and design links
src/app      pages and Route Handlers (/api/v1)
src/server   services: decks, imports, sessions, stats
src/domain   pure functions: scheduler, session builder, import rules
src/shared   Zod schemas and constants
src/ui       components and design tokens
drizzle/     migrations
scripts/     backup, restore, import tools
fixtures/    test decks
```

## Local development

Specified in [PRD section 13](docs/PRD.md#13-local-environment-and-operations). Copy `.env.example` to `.env` first.

| Command | Purpose |
| --- | --- |
| `pnpm db:up` | Start Postgres in Podman |
| `pnpm db:migrate` / `pnpm db:seed` | Apply migrations, create the two profiles |
| `pnpm dev` | Development server. Open it from this Mac only: Next's dev server refuses its scripts to other devices, so a tablet shows a page that never loads |
| `pnpm build` then `pnpm start` | Production server on the home network. Use this for the iPad or any other tablet |
| `pnpm test` / `pnpm test:e2e` | Unit and integration tests, end-to-end tests |
| `pnpm backup` / `pnpm restore <folder>` | Back up and restore the database and images. Set `IMAGE_STORE_PATH` in the shell if images are not in `./data/images`: these scripts do not read `.env` |

## Checks on pull requests

`.github/workflows/checks.yml` runs `scripts/verify.sh` and the Playwright e2e suite on every pull request into `main`, against the merged result. Turn on branch protection for `main` to require both checks before a merge.

## Running at home

Launchd templates for the app, Postgres and the nightly backup are in `ops/launchd/`. Install steps, the iPad address and shortcut, and the reboot and restore checklist are in [docs/operations.md](docs/operations.md).

## Roadmap

| Phase | Name | Gate to move on |
| --- | --- | --- |
| 1 | MVP: web app, local | Acceptance criteria pass; four weeks of real use |
| 1.5 | Extras: confidence tap, per-point reveal, test-date cram mode | Native need confirmed |
| 2 | SwiftUI app: study-plan reminders, offline, sync, login | LLM grading agrees with hand grading in a recorded test |
| 3 | Experiment: spoken answers with LLM feedback, randomised | Owner decides to host, with an access gate ready |
| 4 | Optional deployment | Hosted behind the access gate |

## Documentation

- [Product requirements (PRD)](docs/PRD.md): scope, requirements, learning model, import format, statistics, architecture, data model, API, testing, risks and the decision log.
- Design reference: the Stitch exports and the light and dark design files in [docs/design/](docs/design/README.md). The screens are reference only; the PRD and that README say where they differ.

## First fixture

The first test deck is a small science deck: 16 cards, four topics and seven images (diagrams drawn for this repository). It is in `fixtures/` (`science-w2.csv` and `science-w2-deck.zip`).

## Licence

[MIT](LICENSE).
