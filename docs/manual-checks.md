# Manual checks still open

Automated checks (verify.sh, e2e, axe) do not cover these. Tick them off here as you go.
Last updated 2026-11-04, after F14 (PR 35).

## F14: password sign-in (AC14)
- [ ] Mac Mini: set a real `ADMIN_PASSWORD` in `.env`, then reload the launchd app job (`launchctl kickstart -k`). The edited plist was only linted (`plutil`), never loaded; the job now sources `.env` before `pnpm start`, so confirm the app comes up and `/login` loads.
- [ ] iPad Safari: open the app, expect a redirect to `/login`. A wrong password shows the neutral error. The right password lands on the picker.
- [ ] iPad: restart the app (kickstart), reload. You should still be signed in (30-day cookie).
- [ ] iPad: sidebar profile menu, Log out, expect `/login`. Then open `/library` directly and expect a redirect to `/login`.
- [ ] Rotate `ADMIN_PASSWORD` in `.env`, kickstart. Every device is signed out; sign in again with the new password.
- [ ] The iPad home-screen shortcut and Safari keep separate cookies: sign in on each (documented in `docs/operations.md`).
- [ ] With the sidebar profile menu open, rotate the password, then tap Log out: it should still go to `/login` (F14.9 fix).
- [ ] The theme toggle on `/login` switches light and dark immediately (AC16).
- [ ] iPad: the sidebar profile menu opens and closes by touch (tap the profile button, tap outside, tap an item), and every item (Profile, Settings, Switch profile, Log out) is an easy tap target (44 px).

## Not covered by automation (PRD section 14, still unticked)
- [ ] AC10: Read aloud speaks the question and the answer on the target iPad.
- [ ] AC11: Reboot the Mac Mini and confirm the app and database return with no manual steps; restore last night's backup and confirm decks, progress and images.
- [ ] AC12: Manual accessibility pass on the iPad (focus order, reduced motion, 44 px targets), alongside axe.
- [ ] Device pass on a real iPad in Safari: layout, reading settings, performance on the home network.

## Known flake to watch
Full-suite e2e fails one or two timing tests per run (`deck.spec.ts` loading skeleton, `performance.spec.ts`). `main` shows it too, and both pass alone. If it keeps failing, it needs its own fix.

## F21: hosted deploys and images (AC32)
Copy into the PR checklist. Needs the Vercel project from the Hosted environment runbook in `docs/operations.md`.
- [ ] Push a commit to `main` and another branch: the Vercel dashboard shows no new deployment for either.
- [ ] Push a `v*` tag on a commit on `main`: the `release` workflow succeeds and Vercel deploys that commit to production.
- [ ] Push a `v*` tag on a commit not on `main`: the workflow fails and nothing deploys.
- [ ] A release with a new migration: the build log shows the migration running, and the app has the new schema.
- [ ] A release with a deliberately failing migration: the build fails and the previous deploy stays live (then remove the bad migration).
- [ ] Footer on the hosted app shows `v<package>+<count>.<sha>` or, when the build has no git history, `v<package>+vercel.<sha>`; either is correct.
- [ ] Import the science deck zip on the hosted app, open a card with an image, reload, and the image shows.
- [ ] Open the blob URL directly: it is refused.
- [ ] `GET /images/{id}` returns the image with the section 12 headers, and answers 404 for another profile's image.

## F21: size limits and CLI import (AC33)
- [x] Image limit: make a zip with a padded image just over 4 MB (the zip itself under 4 MB, or use `pnpm import:cli`) and import it. Expect an `image_too_large` warning naming 4 MB, and the card imported without that image.
- [x] Hosted app: choosing an import file over 4 MB is refused with a message naming 4 MB and `pnpm import:cli`.
- [x] Hosted app: the science deck zip (4 MB or less) imports through the web and its images show.
- [x] `pnpm import:cli` with the hosted command in `docs/operations.md` imports a zip larger than 4 MB; the deck and its images show on the hosted app.
