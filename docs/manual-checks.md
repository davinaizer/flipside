# Manual checks still open

Automated checks (verify.sh, e2e, axe) do not cover these. Tick them off here as you go.
Last updated 2026-11-12, after the v0.6.0 release: every check below passed (owner run).

## F14 and F22.6: account sign-in (AC14, AC27)
- [x] Mac Mini: create an account (`pnpm account:create`), then reload the launchd app job (`launchctl kickstart -k`). The edited plist was only linted (`plutil`), never loaded; the job now sources `.env` before `pnpm start`, so confirm the app comes up and `/login` loads.
- [x] iPad Safari: open the app, expect a redirect to `/login`. A wrong password shows the neutral error. The right email and password land on the picker.
- [x] iPad: restart the app (kickstart), reload. You should still be signed in (30-day cookie).
- [x] iPad: sidebar profile menu, Log out, expect `/login`. Then open `/library` directly and expect a redirect to `/login`.
- [x] Run `pnpm account:password <email>`. Every device is signed out; sign in again with the new password.
- [x] The iPad home-screen shortcut and Safari keep separate cookies: sign in on each (documented in `docs/operations.md`).
- [x] With the sidebar profile menu open, rotate the password, then tap Log out: it should still go to `/login` (F14.9 fix).
- [x] The theme toggle on `/login` switches light and dark immediately (AC16).
- [x] iPad: the sidebar profile menu opens and closes by touch (tap the profile button, tap outside, tap an item), and every item (Profile, Settings, Switch profile, Log out) is an easy tap target (44 px).

## Not covered by automation (PRD section 14, still unticked)
- [x] AC10: Read aloud speaks the question and the answer on the target iPad.
- [x] AC11: Reboot the Mac Mini and confirm the app and database return with no manual steps; restore last night's backup and confirm decks, progress and images.
- [x] AC12: Manual accessibility pass on the iPad (focus order, reduced motion, 44 px targets), alongside axe.
- [x] Device pass on a real iPad in Safari: layout, reading settings, performance on the home network.

## Known flake to watch
Full-suite e2e fails one or two timing tests per run (`deck.spec.ts` loading skeleton, `performance.spec.ts`). `main` shows it too, and both pass alone. If it keeps failing, it needs its own fix.

## F21: hosted deploys and images (AC32)
Copy into the PR checklist. Needs the Vercel project from the Hosted environment runbook in `docs/operations.md`.
- [x] Push a commit to `main` and another branch: the Vercel dashboard shows no new deployment for either.
- [x] Push a `v*` tag on a commit on `main`: the `release` workflow succeeds and Vercel deploys that commit to production.
- [x] Push a `v*` tag on a commit not on `main`: the workflow fails and nothing deploys.
- [x] A release with a new migration: the build log shows the migration running, and the app has the new schema.
- [x] A release with a deliberately failing migration: the build fails and the previous deploy stays live (then remove the bad migration).
- [x] Footer on the hosted app shows `v<package>+<count>.<sha>` or, when the build has no git history, `v<package>+vercel.<sha>`; either is correct.
- [x] Import the science deck zip on the hosted app, open a card with an image, reload, and the image shows.
- [x] Open the blob URL directly: it is refused.
- [x] `GET /images/{id}` returns the image with the section 12 headers, and answers 404 for another profile's image.

## F21: size limits and CLI import (AC33)
- [x] Image limit: make a zip with a padded image just over 4 MB (the zip itself under 4 MB, or use `pnpm import:cli`) and import it. Expect an `image_too_large` warning naming 4 MB, and the card imported without that image.
- [x] Hosted app: choosing an import file over 4 MB is refused with a message naming 4 MB and `pnpm import:cli`.
- [x] Hosted app: the science deck zip (4 MB or less) imports through the web and its images show.
- [x] `pnpm import:cli` with the hosted command in `docs/operations.md` imports a zip larger than 4 MB; the deck and its images show on the hosted app.

## F22: accounts on the hosted app (AC27, AC28, AC31), v0.6.0
- [x] `pnpm account:create <email> --adopt-profiles` against the hosted database; the picker shows Davi and Nicole with their decks and progress.
- [x] A wrong password shows the neutral message; signing out returns to `/login`.
- [x] After more than five wrong passwords, the right password is also refused with the same message (AU5); it works again after the window.
- [x] Change password on the Profile page; other devices are signed out.
