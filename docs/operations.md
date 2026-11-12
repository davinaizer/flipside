# Operations runbook

How to run Flipside on the Mac Mini and use it from the iPad. Agents never install anything on the host: every step here is run by the owner.

## What runs

| Job (label) | Starts | Notes |
| --- | --- | --- |
| `com.flipside.db` | `podman machine start`, then `scripts/db.sh up` (Postgres 17 container) | Runs once at login. Starting an already running machine is ignored. If it exits with an error (for example the Podman machine was not ready), launchd retries every 30 s until it succeeds. |
| `com.flipside.app` | `pnpm start` on `0.0.0.0:3000` | Waits (retries every 3 s) until `pg_isready` succeeds in the container, then loads `.env` (so `DATABASE_URL` reaches the app) and starts. Restarted if it exits. |
| `com.flipside.backup` | `scripts/backup.sh` | Every night at 02:30 into `~/flipside-backups`, 14 days kept. |

These are user LaunchAgents, because the Podman machine belongs to your user. For "reboot with no manual steps", turn on automatic login for that user (System Settings, Users & Groups) so the agents load at boot.

## Install

1. Install Podman, Node and pnpm. Then `pnpm install`, `cp .env.example .env`, and run `podman machine init` once.
2. Once: `pnpm db:up`, then `set -a; . ./.env; set +a; pnpm db:migrate && pnpm db:seed`, then `pnpm build`.
3. Install the agents from the repository folder (the templates hold `__REPO__` and `__HOME__`):

   ```bash
   mkdir -p ~/Library/LaunchAgents ~/Library/Logs
   for j in db app backup; do
     sed -e "s|__REPO__|$PWD|g" -e "s|__HOME__|$HOME|g" ops/launchd/com.flipside.$j.plist \
       > ~/Library/LaunchAgents/com.flipside.$j.plist
     plutil -lint ~/Library/LaunchAgents/com.flipside.$j.plist
     launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.flipside.$j.plist
   done
   ```

4. Check: `launchctl list | grep flipside`, logs in `~/Library/Logs/com.flipside.*.log`, and `curl -I http://localhost:3000`.

If `pnpm` or `podman` is not under `/opt/homebrew/bin` or `/usr/local/bin`, edit `PATH` in the installed plists.

After pulling changes: `pnpm install && pnpm build`, then `launchctl kickstart -k gui/$(id -u)/com.flipside.app`.

Uninstall: `launchctl bootout gui/$(id -u)/com.flipside.<job>` and delete the plist.

## iPad

1. Give the Mac Mini a fixed address in the router (DHCP reservation), or use its name from System Settings, General, Sharing (for example `mac-mini.local`).
2. In Safari on the iPad open `http://<address>:3000` (plain HTTP, home network only). The server must be the production one (`pnpm start`, which the launchd app job runs). `pnpm dev` does not work from another device: its scripts get a 403, so the picker stays on grey placeholders and taps do nothing.
3. Share, Add to Home Screen. It is a shortcut to the page; there is no offline mode.

## Signing in

- Every page and `/api/v1` route needs a sign-in token (AU1). Sign in at `/login` with an account's email and password; create accounts with `pnpm account:create` (see Accounts below). There is no app password and no sign-up screen.
- The sign-in lasts 30 days per device. Safari and the iPad home-screen shortcut keep separate cookies, so sign in once in each (the shortcut shows `/login` on its first open). `pnpm account:password` signs the account out of every device.
- Log out in the sidebar profile menu ends the sign-in on that device only.

## Backup and restore

- Manual backup: `pnpm backup`. Each run makes `~/flipside-backups/flipside-YYYY-MM-DD-HHMMSS/` with `database.dump` and `images.tar.gz`.
- The scripts do not read `.env`. If images are stored outside `./data/images`, export `IMAGE_STORE_PATH` first (for the nightly job, add it to `EnvironmentVariables` in the backup plist), or the wrong folder is archived or overwritten.
- Restore: `pnpm restore <backup-folder>`. It refuses when data exists; add `--yes` to replace the database and the images folder.

## AC11 manual checklist (reboot and restore)

Not automated; tick it on the real Mac Mini and record the date in `docs/progress.md`.

Reboot
- [ ] Note a deck, one card's box and one image.
- [ ] Restart the Mac Mini and log in (or rely on automatic login). Touch nothing else.
- [ ] Within a few minutes `curl -I http://localhost:3000` answers, and `podman ps` lists `flipside-postgres`.
- [ ] On the iPad the library opens; the deck, progress and image are as noted.

Restore
- [ ] Run `pnpm backup`; note the folder it made (or use last night's).
- [ ] Make a visible change (delete a deck, or practise a card).
- [ ] Stop the app: `launchctl bootout gui/$(id -u)/com.flipside.app`.
- [ ] `pnpm restore <backup-folder> --yes`.
- [ ] Start the app: `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.flipside.app.plist`.
- [ ] Decks, progress and images match the state at backup time.

## Hosted environment

The hosted app runs on Vercel Hobby with Neon Postgres and a private Vercel Blob store (section 13). Until the first account exists (below), put only seed data on the hosted app.

1. Create a Vercel Hobby project from the personal repository (not an organisation repository). `vercel.json` limits Git deployments to the `release` branch; see Releasing.
2. Add Neon from the Vercel Marketplace. It sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct, used by the migration during the build).
3. In the project Storage tab create a private Blob store and connect it. It sets `BLOB_READ_WRITE_TOKEN`.
4. Set `IMAGE_STORE_DRIVER=vercel-blob` in the project environment variables for Production.
5. Tag a release (see Releasing). The first build runs the migrations; seed the profiles once with `pnpm db:seed` against the direct connection string.
6. Check usage weekly for the first month (R11): Vercel (functions, bandwidth, Blob) and Neon (compute hours, storage) dashboards. If an allotment runs out, that feature stops until it resets; Vercel Pro or Neon Launch is the paid fallback.

The manual checks for AC32 and AC33 are in `docs/manual-checks.md`.

## Accounts

There is no sign-up screen (AU4). Both commands ask for the password twice (hidden; the minimum length is `PASSWORD_MIN_LENGTH` in `src/shared/constants.ts`) and need `DATABASE_URL`. On the hosted app use the direct (unpooled) connection string, as for the import below.

- First hosted account: `pnpm account:create <email> --adopt-profiles`. It creates the account and, in one step, gives it every profile that has none, so Davi and Nicole keep their decks and progress (AU6). Run it once; later accounts start with no profiles.
- Forgotten password (R12): `pnpm account:password <email>`. It stores the new password and signs the account out everywhere (its sign-in tokens are revoked).
- Local development: `pnpm db:seed` creates the account from `DEV_ACCOUNT_EMAIL` and `DEV_ACCOUNT_PASSWORD` in `.env` and gives it the two seeded profiles. Leave both unset on the hosted app.

## Import against the hosted app (AC33)

`pnpm import:cli` talks to the database and the image store directly, so it can import a zip larger than the 4 MB web limit (the zip limits still apply). Use the direct (unpooled) connection string and the Blob token from the Vercel project settings:

```bash
DATABASE_URL="$DATABASE_URL_UNPOOLED" \
IMAGE_STORE_DRIVER=vercel-blob \
BLOB_READ_WRITE_TOKEN=<token> \
pnpm import:cli deck.zip --profile Davi --name "Science W2"
```

Without `IMAGE_STORE_DRIVER` the images go to the local disk, not the hosted store.

## Releasing

Production deploys only from a version tag (H3). Vercel builds the `release` branch only; pushes to `main` and other branches build nothing.

1. Merge the work into `main` and pull it.
2. Review `README.md` against what this release ships (status line, features, stack, commands, roadmap) and set `version` in `package.json` to the tag's version. Land any change through a PR into `main` before tagging.
3. Tag the commit and push the tag: `git tag v0.6.0 && git push origin v0.6.0`.
4. The `release` workflow checks that the tagged commit is an ancestor of `origin/main`, then moves `release` to the tag. A tag on a commit outside `main` fails the workflow and deploys nothing.
5. Vercel builds `release`: it runs the migrations, then the app.

## Rolling back

Either redeploy the previous production deploy in the Vercel dashboard (Deployments, the older one, Redeploy), or tag an older commit that is on `main` and push the tag. Migrations are not reverted by either; roll the database back from a backup if a migration is the cause.
