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
