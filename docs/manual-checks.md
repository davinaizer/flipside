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

## F21: hosted images (AC32)
- [ ] Against a real private Vercel Blob store: set `IMAGE_STORE_DRIVER=vercel-blob` (token or OIDC), add a card image, reload the card and confirm it shows; open the blob URL directly and confirm it is refused; confirm `GET /images/{id}` still checks ownership.
