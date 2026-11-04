# Progress

Append-only. One to three lines per task or event: date, task id, what, commit. Read the tail at session start.

- 2026-11-03: v0.3 review backlog started (F9 to F14, PRD D22 to D26). F0 to F8 log archived in docs/archive/v0.2/progress.md.
F9.1 dark theme now sets --elevation-card to 0 4px 16px -2px rgba(0,0,0,0.4) (same token name as light); DESIGN-DARK.md updated; tokens.test.ts checks both themes and no shadow-[...] in src.
F9.2: added shadow-card to the remaining card surfaces (ReadingCard, practice card, settings popover, Progress tiles); tokens.test.ts now fails if any rounded-card or rounded-3xl box lacks it.
F9.3: buttonClass now has hover, pressed (active) and focus-visible classes, pressed scale guarded by motion-reduce; profile tile and the read-aloud switch card share TAPPABLE_CARD.
F9.4: ThemeToggle is now one sun/moon switch with no visible text; component test covers role, name, state, icons and click.
F9.5: new TopBar (theme switch and profile avatar slot, no product title) in the app layout; ThemeToggle removed from the Sidebar; component test covers both.
- F9.6: theme switch added to the practice top bar (beside settings) and top-right of the profile picker; ThemeSwitch split out for reuse.
- F9.7: e2e/a11y.spec.ts checks the theme switch on picker, practice and summary (reload on practice); added the missing switch to the summary.
- 2026-11-03: REVIEW F9 round 1: GAPS at e68a707 (U2 hover/pressed/focus missing on several buttons; fix tasks F9.8, F9.9)
- F9.8: GradeBar buttons, Try again, ThemeSwitch and the delete confirm button now have hover, pressed (PRESSED) and FOCUS_RING; class assertions added.
F9.9: Choice pills, Progress range buttons and colour swatches now have pressed and focus; tokens.test.ts greps every <button under src/ui for a shared helper.
- 2026-11-03: REVIEW F9 round 2: GAPS at 59dd63f (U2: import radio labels lack hover/pressed; sidebar nav pills; scale-only pressed under reduced motion)
- F9.10: import swatches/pills, sidebar nav, Choice, range buttons, iconButton gained hover/active colour and focus; guard test covers cursor-pointer labels.
- 2026-11-03: REVIEW F9 round 3: GAPS at 18cab98 (Library deck link lacks pressed/focus ring; no theme switch on practice/summary load-error states)
- F9.11: Library deck link has pressed, focus ring and active tone; LoadError (theme switch above ErrorState) used by practice and summary load failures; guard test covers Link.
- 2026-11-03: REVIEW F9 round 4: GAPS at 57c4618 (no theme switch on the 'session has no cards' practice state)
- F9.12: shared ThemeBar now wraps LoadError, the no-cards state and the summary; test added in PracticeHeader.test.tsx.
- 2026-11-03: REVIEW F9 round 5: GAPS at 89c77d2 (root error.tsx has no theme switch; low severity, unexpected server failure only)
- F9.13: root error.tsx now shows the attribute-only theme switch via RootErrorView; picker shares AttributeThemeSwitch.
- 2026-11-03: REVIEW F9 round 6: PASS at aa03e17
- 2026-11-03: F9 done (PR 27). MANUAL PENDING: none.
F9.14: removed the theme switch from practice (card header, no cards, load error); summary and picker keep it. Deviation logged in decisions.md.
- 2026-11-03: F9.14 user-directed: theme switch removed from practice screens (deviation from T6/AC16; PRD for user to update). Not re-reviewed.
F10.1 added updateProfileRequestSchema (avatar and name both optional, at least one required, for PATCH /me) and PROFILE_NAME_MAX; tests in shared.test.ts.
F10.2: updateProfile service and PATCH /api/v1/me (422 with issue messages on invalid input); tests in tests/profile-update-api.test.ts.
F10.3: /profile page with ProfileForm (avatar radio grid with tick, name field with inline error, Save via api.updateProfile PATCH /me); tests in ProfileScreen.test.tsx.
F10.4: top-bar avatar now links to /profile (named "<name>, open profile"); layout passes name; router.refresh after save updates shell, picker is force-dynamic. Unit tests added.
F10.5: e2e/profiles.spec.ts covers AC15 (edit avatar and name, top bar, picker, reload, empty and 25-char rejected).
REVIEW F10 round 1: GAPS at bd94793
F10.6: profile e2e now uses its own seeded profile per project and asserts glyph and name in top bar, sidebar and picker, before and after reload.
REVIEW F10 round 2: PASS at 4226c87
F10 done: PR 28, review PASS, verify and e2e green. MANUAL PENDING: none.
F11.1: Show answer has an eye icon; the hint now sits below the button, outside the card (PracticeView test).
F11.2: both card faces render in a CSS 3D flip (perspective, rotateY, backface-visibility); the hidden face is aria-hidden and inert; tap on the front, Show answer and Space reveal; keyed per card so a new card never animates. Reduced motion is F11.3.
F11.3: reduced motion applies no rotation or transition (inert face hidden); Undo last remounts the card scene so it lands on the front with no reverse flip.
F11.4: "How well did you know this?" prompt sits above the grade buttons and labels the button group (aria-labelledby).
F11.5: no code change needed; the timer starts in showFront (front shown) and the existing use-session test covers it; performance e2e passes (next card 54-127 ms).
F11.6: e2e AC17 (reveal by button, card tap and Space; hover, pressed, focus-visible on Show answer in both themes; hover skipped on touch). Seeded "Practice flip" profiles; fixed the 5-card test to look at the visible face since both faces are now in the DOM. Axe in both themes already covered by existing walks.
REVIEW F11 round 1: PASS at e1a2d27
F11 done: PR 32, review PASS, verify and e2e green. MANUAL PENDING: none.
F12.1: GET /sessions/{id}/summary now returns deckName and severalDecks (goAgain already had topic and deckName); tested with one and two decks.
F12.2: added summaryViewModel (deck label, cards, time, grade counts, revisit max three, badge count) with unit tests.
F12.3: SummaryView rebuilt to the mockup (deck card, count ring, time, grade chips with icons, Cards to revisit panel, Practise those now, Back to Library); e2e button name updated.
F12.4: e2e AC18 (grades given vs summary figures, Practise those now starts the misses, axe in both themes); added "summary" e2e-seed profiles.
REVIEW F12 round 1: PASS at dec10ce
F12 done: PR 33, review PASS, verify and e2e green. MANUAL PENDING: none.
F13.1 read-aloud switch no longer prints On/Off; state is carried by aria-checked and the track; label stays "Read questions aloud" (e2e regex unchanged).
F13.2: Settings preview now shows topic chip, Question label, question, read-aloud button and the flip hint; Chip and QuestionLabel are shared with PracticeView (practice front also gains the Question label).
F13.3 Delete deck moved into the Edit deck panel (EditDeckPanel); e2e delete test opens Edit deck first (not run).
F13.4 ImportFlow form is a single flex column (max-w-3xl); the wrapper div stays, sections 1, 2, 3 in source order; test reads the source (no jsdom).
F13.5 done: e2e for switch state, preview elements, Delete only in Edit deck, import single column (desktop, iPad landscape and portrait, both themes).
REVIEW F13 round 1: GAPS at 5ca7b3e
F13.6: practice front is one PracticeFront component (chip, read-aloud slot, Question label, question, image, hint inside the card) used by PracticeView and the Settings preview; ReadingCard removed.
F13.7 import column widened from max-w-3xl to max-w-6xl; import e2e passes (desktop and iPad).
REVIEW F13 round 2: GAPS at 160c2ad
F13.8: Read question aloud stops click propagation so it no longer reveals the answer; unit and e2e tests added.
REVIEW F13 round 3: PASS at 165c106
F13 done: PR 34, review PASS (round 3), verify and e2e green. MANUAL PENDING: none.
F14.1 done: ADMIN_PASSWORD required in env schema, AUTH_COOKIE_NAME and 30-day max age in src/shared/constants, .env.example placeholder, vitest and playwright set a test password.
- F14.2: src/server/auth.ts (checkPassword, signAuthToken, verifyAuthToken) with unit tests.
F14.3: POST /auth/login (sets signed flipside_auth cookie) and /auth/logout (clears it), with a handler-level API test.
F14.4: src/proxy.ts calls checkAccess (src/server/http/access.ts), the single cookie check: pages redirect to /login, /api/v1 returns 401, open: GET /health, POST /auth/login, /login page.
F14.5: /login page on the picker layout (LoginForm + LoginScreen), api.login in the client; tests are static-render plus a fetch stub.
F14.6: Sign out button on the Profile page calls /auth/logout and goes to /login; removed the sign-out placeholder slot.
F14.7: e2e helpers export a signed-in `test` (and signInContext for new contexts); every spec uses it; new e2e/auth.spec.ts covers redirect, 401, wrong password, sign out, axe on /login in both themes.
F14.8: docs/operations.md gains an App password section (ADMIN_PASSWORD, rotation, iPad shortcut signs in separately); the launchd app job sources .env before pnpm start.
REVIEW F14 round 1: GAPS at e1d44de (Sign out does nothing when logout returns 401; fix task F14.9)
F14.9: signOut navigates to /login in a finally block, swallowing a 401 from logout; unit test with a 401 stub.
REVIEW F14 round 2: PASS at 0104871
F14 done: password sign-in (PR 35). Merged with full-suite e2e flaky (deck skeleton, performance), same flake on main; user approved. MANUAL PENDING: none
F15.1: logOut(push) moved to src/ui/profile/sign-out.ts (tests for 401 and fetch throw); ProfileScreen uses it.
F15.2: sidebar footer is now a ProfileMenu button (Profile, Settings, Switch profile, Log out); Settings left the main nav; e2e open the menu first.
F15.3: top bar is the theme toggle only (no props); Sign out button removed from the Profile page; auth and profiles e2e go through the sidebar menu.
F15.4: e2e/profile-menu.spec.ts covers the menu items, 44 px targets, Escape, navigation and axe open in both themes on desktop and iPad; Log out stays in auth.spec.
F15.5: manual checks and operations now say Log out in the sidebar profile menu; added an iPad touch check for the menu.
REVIEW F15 round 1: GAPS at 3dc070a (focus return after Escape and outside-click close not asserted in e2e; fix task F15.6)
F15.6: profile menu e2e asserts focus returns to the trigger after Escape and that an outside click closes the menu; outside click no longer pulls focus back to the trigger (it followed the click anyway).
REVIEW F15 round 2: PASS at 40ef0d0
F15 done: sidebar profile menu merged via PR 41. MANUAL PENDING: none from the ledger (iPad menu check added to docs/manual-checks.md).
- F16.1: collapse toggle and icon rail in Sidebar/ProfileMenu (panelLeft icon); state not yet persisted (F16.2). Tests in Sidebar.test.tsx.
- F16.2: collapsed state persisted in localStorage (sidebar-state.ts, useSyncExternalStore); e2e collapse, reload, nav, menu and axe in both themes.
REVIEW F16 round 1: PASS at b255c10
F16 done: collapsible sidebar, PR 43. MANUAL PENDING: none from the ledger.
F17.1: ellipsis DeckMenu (Edit deck, Re-import) on Library cards; deck page lost both buttons; reviewCount added to /library. Static-render tests; e2e deferred to F17.4.
