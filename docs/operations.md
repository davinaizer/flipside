# Operations runbook

How to run Flipside on the Mac Mini and use it from the iPad. Agents never install anything on the host: every step here is run by the owner.

## What runs

| Job (label) | Starts | Notes |
| --- | --- | --- |
| `com.flipside.db` | `podman machine start`, then `scripts/db.sh up` (Postgres 17 container) | Runs once at login. Starting an already running machine is ignored. If it exits with an error (for example the Podman machine was not ready), launchd retries every 30 s until it succeeds. |
| `com.flipside.app` | `pnpm start` on `0.0.0.0:3000` | Waits (retries every 3 s) until `pg_isready` succeeds in the container, then loads `.env` (so `ADMIN_PASSWORD` and `DATABASE_URL` reach the app) and starts. Restarted if it exits. |
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

## App password

- Every page and `/api/v1` route needs the app password, set as `ADMIN_PASSWORD` in `.env` (required: the app does not start without it; `.env.example` holds the placeholder `change-me`, so pick your own). The launchd app job sources `.env`, so no plist edit is needed.
- Rotation: edit `ADMIN_PASSWORD` in `.env`, then `launchctl kickstart -k gui/$(id -u)/com.flipside.app`. The cookie is signed under a key derived from the password, so this signs every device out; each one must sign in again with the new password.
- The sign-in lasts 30 days per device. Safari and the iPad home-screen shortcut keep separate cookies, so sign in once in each (the shortcut shows `/login` on its first open). Rotation signs out both.
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

## Releasing

Production deploys only from a version tag (H3). Vercel builds the `release` branch only; pushes to `main` and other branches build nothing.

1. Merge the work into `main` and pull it.
2. Tag the commit and push the tag: `git tag v0.6.0 && git push origin v0.6.0`.
3. The `release` workflow checks that the tagged commit is an ancestor of `origin/main`, then moves `release` to the tag. A tag on a commit outside `main` fails the workflow and deploys nothing.
4. Vercel builds `release`: it runs the migrations, then the app.

## Rolling back

Either redeploy the previous production deploy in the Vercel dashboard (Deployments, the older one, Redeploy), or tag an older commit that is on `main` and push the tag. Migrations are not reverted by either; roll the database back from a backup if a migration is the cause.
