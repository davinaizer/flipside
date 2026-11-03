# Design audit: implemented app vs Stitch mockups

Audited 2026-11-02 on branch `ci/github-actions-checks` (clean). Report only; no app code was changed.

## Scope and method

- Mockups: `docs/design/stitch_flashcard_learning_app/<screen>/screen.png`. Rules: `docs/design/README.md` (its corrections and "PRD wins" list), `DESIGN.md`, `DESIGN-DARK.md`, `src/ui/tokens.css`, PRD requirement tables.
- App run with `pnpm dev` against the local seeded Postgres (profile Davi, one deck "Test"), in the built-in browser at 1180x820 (iPad landscape). Library was also captured in dark theme.
- Screens were compared visually against the PNGs, then the cause was found in `src/ui`. Where the PRD or a README correction removes something from a mockup, it is not counted as a defect.
- Mockup paths below are the folder names under `stitch_flashcard_learning_app/`; add `_dark_mode` for dark.
- Severity: **blocker** breaks a PRD acceptance criterion; **major** clearly differs from the mockup or the design system in a way a user notices; **minor** polish or optional detail.

## What could not be verified

- **UNVERIFIED** Dark theme on every screen except Library. Light-theme findings about structure apply to both, but dark colours were only checked on Library.
- **UNVERIFIED** Import preview table, import success, error with retry, empty Library and loading skeleton were compared from the code and the mockups, not captured live (needs a CSV upload, a stopped server, an empty profile).
- **UNVERIFIED** Desktop width (>1200px) and iPad portrait. Only 1180x820 was captured.
- **UNVERIFIED** Hover, pressed and keyboard-focus states (DESIGN.md asks for a soft 3px periwinkle ring offset by 2px). Nothing in `src/ui` sets a shared focus ring; `ThemeToggle`, `Sidebar` links and `Choice` chips define only hover.
- **UNVERIFIED** Practice section of Settings (below the fold in the captured view) and the `Nearly`/`Got it` sublabels, which come from the scheduler.
- **UNVERIFIED** Mockups opened: `profile_picker`, `library`, `library_dark_mode`, `deck_detail`, `practice_session`, `practice_answer_revealed`, `practice_session_summary`, `progress`, `settings`, `add_deck_re_import`, `empty_library`, `error_with_retry`, `import_success`. Not opened: `loading_skeleton` and every other dark PNG.

## Things that match

- No raw hex values outside `src/ui/tokens.css` (grep of `src`).
- Semantic tokens only; light and dark both switch (`data-theme`), and Library renders correctly in dark.
- Fonts: Lexend headings and Atkinson body load from the bundle; Settings offers "System Sans" (README item 8).
- Three grades with the right names, icons and scheduler sublabels (R4); "Undo last" instead of "Undo flip" (README item 4).
- Segmented session progress with done, current and remaining states (R8).
- Controls are at least 44px (`min-h-11`), including the 44px checkbox.
- Sidebar highlights Library on `/decks/*` and `/import` (README item 16).
- Profile counts, sync wording, offline claims, Box/Leitner wording, "Focus clue", "Review all answers" and theme names are all absent, as the README requires.
- Error copy follows README item 13; empty Library has one "Add deck" plus "Download CSV template" (README item 14).
- Progress tiles use "Got it rate" and "Days practised", and Focus next and By deck say mastery (README items 5 and 17).

## Cross-cutting findings

| ID | Element | Expected (mockup) | Actual | Sev | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| G1 | Sidebar brand and nav | Logo plus "Flipside" wordmark at top; an icon beside each nav item (all screens, e.g. `library`) | `src/ui/shell/Sidebar.tsx:18-40` renders text-only links, no logo, no icons | major | Add the app logo and one icon per section; keep `min-h-11` |
| G2 | Sidebar profile block | White rounded card holding avatar, name, and a tinted "Switch profile" pill with icon (`deck_detail`) | `Sidebar.tsx:41-53`: bare avatar and name, then a text "Dark theme: Off" row, then a plain text link | minor | Wrap in a card; style Switch profile as the secondary pill; move theme (see ST1) |
| G3 | Top bar | Header strip with page or app title and profile icon button (`library`, `settings`) | None; `src/app/(app)/layout.tsx:16-19` has sidebar and `<main>` only. Sync badges there are correctly omitted (README 2) | minor | Decide with the PRD owner whether a bar is wanted without the sync chip; otherwise log as ASSUMED omitted |
| G4 | Surfaces and elevation | White cards (DESIGN: `#fff` 90%) on a tinted canvas with a soft ambient shadow `0 8px 24px -4px` periwinkle at 6% | Every card is flat `bg-surface-container` (blue-grey) with no shadow: `LibraryView.tsx:72,138`, `DeckView.tsx:78`, `ProgressView.tsx:15`, `PracticeChart.tsx:29`, `ImportFlow.tsx:91,120` | major | Add a card surface token (white) and one elevation token; apply in one shared card class |
| G5 | Secondary button | DESIGN "Secondary Tinted": lavender wash, indigo text, borderless, same pill size | Secondary actions are transparent with a 1px grey outline (`outline outline-1 outline-outline`): `LibraryView.tsx:94,122`, `DeckView.tsx:57,65`, `SummaryView.tsx:80`, `ErrorState.tsx:21`, `ImportSuccess.tsx:42`, `ProgressView.tsx:51` | major | Define the tinted secondary variant once and use it everywhere |
| G5b | No shared button | One Button with primary and secondary variants | Class strings are repeated: `const button` in `LibraryView.tsx:15` and `DeckView.tsx:27`, plus ad hoc copies in `ImportFlow.tsx:176`, `ErrorState.tsx:15`, `SummaryView.tsx:75`, `FocusNext.tsx:36`, `PracticeView.tsx:134`, `ReadingSettings.tsx:37,96` | major | This is a real repeat (8+ sites), so extract a Button/LinkButton in `src/ui`; this fixes G5 at the same time |
| G6 | Action icons | Plus on Add deck, play on Start practice and Practise, home on Back to Library, save on Add cards | No icons on any primary action | minor | Add icons beside the label; keep text so colour and icon are never the only signal |
| G7 | Corner radius | Containers 2rem (DESIGN "Shapes"); mockups show about 32px | Cards use `rounded-2xl` (16px) or `rounded-3xl` (24px) | minor | Use the 2rem token for cards |
| G8 | Token coverage | DESIGN.md defines `surface-container-lowest`, `surface-container-highest`, `inverse-surface`, `tertiary`, `error-container` | `tokens.css:5-42` has none of them, so white cards, the dark "12 due" pill and mint success cannot be expressed | major | Add the missing semantic tokens in both themes before restyling (root cause of G4, LB7, SM1) |
| G9 | Mastery bar colours in dark | Saturated orange, peach and indigo segments (`library_dark_mode`) | `MasteryBar.tsx:6-9` reuses the chip fills (`--box-not-yet #4f2500`, `--box-nearly #463c00`) as bar fills, so Not yet and Nearly are near-invisible on the dark card (seen on Library). The `outline-outline-variant` and swatch outlines at lines 20 and 30 are a workaround | major | Add separate bar tokens (bright) from chip tokens (muted); verify 3:1 against the card |

## Profile picker (`/`) - `profile_picker`, `profile_picker_dark_mode`

| ID | Element | Expected | Actual | Sev | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| PP1 | Heading and subtitle | "Who is revising today?" plus a one-line subtitle | `ProfilePicker.tsx:45` "Who is studying?", no subtitle | flag | PRD section 9 lists the picker as "Not yet designed", so the PRD does not fix the copy. Decide and log it; not counted as a defect |
| PP2 | Brand chip | Logo and "Flipside" pill above the heading | None | minor | Add the app logo chip (README 11) |
| PP3 | Profile cards | White 32px card, large avatar with an accent bar along the top, name, "Open revision desk" link | `ProfilePicker.tsx:58-61`: flat blue-grey tile, avatar and name only. The emoji avatars are the D15 placeholders and are fine; role tags and counts are omitted per README 6 and 10 | major | Restyle to the card surface (G4), keep avatar and name, add a single clear action line |
| PP4 | Background and footer | Soft radial tints; footer line "Profiles keep decks, progress and reading settings separate" | Flat `bg-surface`, no footer | minor | Optional; keep the footer without "local" or sync wording |

## Library (`/library`) - `library`, `library_dark_mode`, `empty_library`, `loading_skeleton`

| ID | Element | Expected | Actual | Sev | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| LB1 | Header | Title left; search and Add deck (with plus icon) on the same row | `LibraryView.tsx:50-69`: title and Add deck on one row, search on its own row below | minor | Put search beside Add deck |
| LB2 | Search field | Pill with magnifier, white fill, soft periwinkle border, slate placeholder | `LibraryView.tsx:67`: tinted fill, grey outline, no icon | minor | Add icon and the input style from DESIGN "Input Fields" (check placeholder contrast, README 9 and PRD s8) |
| LB3 | Today panel | "Today" chip, large "47 cards due", "Across N decks · N cards per session", Start practice with play icon, Weak cards with a dot | `LibraryView.tsx:70-104`: heading "Today" and a sentence at body size; no icons. L1 content is present but the due count has no emphasis | major | Make the due count the display-size figure; keep the L1 facts |
| LB4 | Overall Library Mastery strip | Percentage, Not yet / Nearly / Got it counts and a combined bar inside the Today panel | Absent | flag | Not in L1-L8 and not on the README omit list. Needs a PRD decision; not counted |
| LB5 | Group heading | Deck count chip beside the name; one shared legend at the right | `LibraryView.tsx:135` name only; a legend is repeated on every deck | minor | Add the count chip; show the legend once per group |
| LB6 | Deck avatar | Rounded tile in the deck colour with the deck's initial (B, C, SD) | `LibraryView.tsx:141-144`: an empty colour square with an outline; with the default Mist colour it reads as a blank box | major | Render the initial inside the tile |
| LB7 | Due badge | Dark navy pill ("12 due"); soft "Up to date" pill at zero | `LibraryView.tsx:160`: indigo pill, shows "0 due" | minor | Use the inverse-surface token (G8); optional "Up to date" for zero |
| LB8 | Mastery bar | Thin three-segment bar, caption "6 Not yet · 9 Nearly · 49 Got it", percentage at the right | `MasteryBar.tsx` shows New plus a four-item legend of dot chips and no percentage. L5 requires the legend, so this is a layout difference only | minor | Keep the L5 legend; optionally right-align the Got it percentage. Colour fix is G9 |
| LB9 | Add deck tile | Dashed "Add deck" tile at the end of the grid | Absent; the header button covers L7 | flag | Optional; not counted |
| LB10 | Empty state | Illustration, card container, primary "Add deck" and tinted "Download CSV template" (README 14 trims the rest) | `LibraryView.tsx:107-127`: heading, one line, two buttons with no container; second button uses the outline variant (G5) | minor | Wrap in a card and apply G5. **UNVERIFIED** live |
| LB11 | Widths | Content fills the page | Today panel is `max-w-3xl` while the grid is `max-w-5xl` (lines 72 and 136), so right edges do not line up and the right third is empty | minor | Use one max width |
| LB12 | Loading skeleton | Skeleton shaped like the Library | `Skeleton.tsx:6-14` is three generic bars for every route | minor | **UNVERIFIED** against `loading_skeleton`; compare and match the Library shape |

## Deck (`/decks/[id]`) - `deck_detail`, `deck_detail_dark_mode`

| ID | Element | Expected | Actual | Sev | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| DK1 | Header | White "Library" back pill with chevron; deck initial avatar, title, subtitle; "Edit deck" and the large "Practise N due cards" (play icon) on one row | `DeckView.tsx:35-69`: plain text back link, title, subtitle, then the Practise button, then Edit deck, Re-import and Delete on a second row, all outline pills | major | Rebuild the header row; keep Re-import and Delete (D5, D7) but visually quieter than Practise |
| DK2 | Whole-deck bar | Deck mastery bar, legend, "Cards due: N" under the header | Absent; only per-topic bars | flag | D1 lists topics only. Needs a decision; not counted |
| DK3 | Topic list | Table with TOPIC, DUE, PROGRESS, MASTERED columns; dark due pill or "None due"; one legend in the header | `DeckView.tsx:76-97`: two-column grid of cards; each repeats a four-item legend and a "N cards · N due · N% mastered" line | major | Table rows; one legend. D1 content stays |
| DK4 | Topic tick | Round tick control (DESIGN: soft squircle with a teal check) | `DeckView.tsx:80-85`: native checkbox stretched to `h-11 w-11`, rendering as a large white square with a default tick | major | Custom-styled checkbox that keeps the 44px target and label |
| DK5 | Helper text | "Tick topics to practise only those. Leave all unticked to practise everything that is due." under Topics | Absent | minor | Add (clarifies D2) |

## Practice (`/practice/[sessionId]`) - `practice_session`, `practice_answer_revealed`, dark variants

| ID | Element | Expected | Actual | Sev | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| PR1 | Grade buttons | Tinted per grade: Not yet peach with orange label, Nearly cream with amber label, Got it periwinkle with indigo label; large label and sublabel | `GradeBar.tsx:41`: all three use `bg-surface-container-high` and `text-on-surface`, so they look identical. `--box-not-yet`, `--box-nearly`, `--box-got-it` already exist in `tokens.css` and are unused here | major | Map each grade to its box token pair (README 9: darken labels if contrast under 4.5:1). Icon and label stay |
| PR2 | Grade icons | Not yet: refresh; Nearly: trend arrow; Got it: check in circle | `GradeBar.tsx:5-7`: Nearly is a minus-with-dots glyph (reads as a divide sign); Got it is a bare tick | minor | Swap the Nearly glyph |
| PR3 | Top bar | Left: "End session" white pill with icon. Centre: pill "System Design · 1 of 5". Right: round speaker and settings icon buttons | `PracticeScreen.tsx:60-67` puts End session and Undo last as underlined text at the bottom; `SettingsPopover.tsx:33` has an underlined "Reading settings" link top-right; the deck name is not shown; "Card 1 of 1" is centred text above the bar (`PracticeView.tsx:29`). R13 asks for the shortcut "in the top bar" | major | Build the top bar; keep Undo last (R6) near the grade bar as a visible secondary button |
| PR4 | Read aloud | Round speaker button inside the card, top right | `PracticeView.tsx:121-129`: centred underlined text "Read question aloud" below the card | major | Icon button with an accessible name; keep it hidden when speech is unavailable (existing behaviour) |
| PR5 | Card details | Topic chip in a warm tint; "QUESTION" eyebrow; soft shadow; hint and flip text in a footer row | `PracticeView.tsx:99`: topic chip in indigo (`primary-container`); no eyebrow; no shadow (G4). Card colour comes from the reading settings (T1), so a tinted card is correct | minor | Warm chip token, eyebrow label, shadow. "Review card" chip is not in the PRD and stays omitted |

## Session summary (end of `/practice/[sessionId]`) - `practice_session_summary`, `session_summary_dark_mode`

| ID | Element | Expected | Actual | Sev | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| SM1 | Grade chips | Got it, Nearly and Not yet chips tinted in their grade colours | `SummaryView.tsx:43`: all neutral `bg-surface-container-high` | minor | Use the box tokens (same as PR1) |
| SM2 | Layout | Two columns: deck and time card with progress ring, and a cards-to-revisit panel with tinted rows | `SummaryView.tsx:35-63`: one narrow left-aligned column; no deck name, no ring. R11 content is complete; Box labels, Focus clue, Review all answers are correctly omitted | minor | Two-column layout; ring is optional |
| SM3 | Actions | Back to Library is the filled primary with a home icon; "Practise those now" sits inside the revisit card | `SummaryView.tsx:70-82`: Practise the misses is primary, Back to Library is an outline pill | minor | Keep R11 actions; restyle with G5 and icons |

## Progress (`/progress`) - `progress`, `progress_dark_mode`

| ID | Element | Expected | Actual | Sev | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| PG1 | Metric tiles | Four tiles, each with its own tint, uppercase label, top-right icon, big number with small unit ("11 s", "5 of 7") and a delta line with an arrow | `ProgressView.tsx:13-21`: identical blue-grey tiles in a 2x2 grid (`max-w-4xl`); plain label; the fallback "No earlier figure to compare" repeats in two tiles | major | Per-tile tint tokens, icons, unit styling; four across at iPad width |
| PG2 | Range switch | One segmented tray: This week / This month | `ProgressView.tsx:41-57`: two separate pills, the unselected one outlined | minor | One tray, selected segment raised |
| PG3 | Chart | Pill-capped bars, colour per day, current bar highlighted, "Daily average" chip | `PracticeChart.tsx:38-43`: square-topped bars in one colour; the current bar has a heavy 2px `outline-on-surface` (near-black) outline. The outline plus "Today" tag is deliberate (PRD s8) but harsh | minor | Keep outline and tag; use a primary ring token and `rounded-full` tops |
| PG4 | Focus next | Sits beside the chart; each row is a link with a colour marker, "Deck · N% mastery" and a chevron | `FocusNext.tsx:25-41`: three full-width cards stacked below the chart, each with a filled "Practise" button | minor | S3 only needs each topic to open practice; rows as links are enough |
| PG5 | By deck | Colour dot, mastery % with a segmented bar, relative "Last practised" ("3 days ago") | `ByDeckTable.tsx:26-37`: plain table, "0% (0)", header "Median time", absolute "2 Nov 2026" | minor | Add the bar and dot; relative dates optional |
| PG6 | Page subtitle | One line under the title, saying mastery not retention (README 17) | Absent | minor | Add. Also `ProgressView.tsx:32` says mastery sections "come with later tasks" but they are built; update the comment |

## Settings (`/settings`) - `settings`, `settings_dark_mode`

| ID | Element | Expected | Actual | Sev | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| ST1 | Theme control | Light / Dark segmented control with sun and moon icons at the top of Reading | Not on the Settings page. `ThemeToggle.tsx:9-17` is a text button "Dark theme: Off" in the sidebar: a `role="switch"` with no visible track or knob, so it reads as a menu line (hover only) | major | T5 does not fix the location, but the control needs a switch or segmented look; the Settings page is where the mockup puts it |
| ST2 | Card colour | Round swatches in each card colour with the name beneath and a ring on the selected one | `ReadingSettings.tsx:86-92`: plain text chips ("Mist", "Cream") with no colour shown. The import form already has real swatches (`ImportFlow.tsx:149-155`) | major | Reuse the swatch pattern in one component |
| ST3 | Text size | Minus, current label, plus stepper | Four chips (`ReadingSettings.tsx:65-71`). T1 says four steps; either form meets it | minor | Optional |
| ST4 | Option chips | White pills with soft border; selected filled indigo | `ReadingSettings.tsx:37-39`: unselected chips are flat `bg-surface-container`, so they merge with the page | minor | Use the card surface (G4) |
| ST5 | Preview | Card with eyebrow "QUESTION", a "Answer" label, bullets, footer hint, "Live rendering" chip | `ReadingCard.tsx:39-52`: question and bullets only | minor | Optional; chip is not in the PRD |
| ST6 | Page chrome | Subtitle; section headings with an icon chip and a divider | `ReadingSettings.tsx:55`: headings only, no subtitle seen on the page. Subtitle must avoid "iPad" and sync wording (README 2) | minor | Optional |

## Add or re-import deck and import success (`/import`) - `add_deck_re_import`, `import_success`

| ID | Element | Expected | Actual | Sev | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| IM1 | Flow chrome | "Back to Library" pill, tinted Cancel pill, primary "Add 35 cards" with a save icon; a native-looking target-deck select | `ImportFlow.tsx:176-179`: no back link, Cancel is an underlined link, no icon. Steps appear in order (1, preview, 3) rather than all at once; that fits I1 | minor | Apply G5 and G6. Preview table **UNVERIFIED** |
| IM2 | Success | Success badge, name with colour dot and group chip, counts, and Start practice plus View in Library | `ImportSuccess.tsx:9-47`: bare text on the canvas (no card), "Open deck" and "Back to library". README 15 limits content to name, added and updated, two actions, so the content is right. Copy says "Back to library" while elsewhere it is "Back to Library" (`SummaryView.tsx:81`) | minor | Put it in a card with a success icon; unify the casing. **UNVERIFIED** live |

## Error with retry - `error_with_retry`, `error_with_retry_dark_mode`

| ID | Element | Expected | Actual | Sev | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| ER1 | Error card | Centred white card with a wifi-off icon badge; Retry (with icon) plus a tinted Switch profile pill | `ErrorState.tsx:6-26`: left-aligned text with a filled Retry and an outline Switch profile. Copy matches README 13. The sidebar highlight follows the route (README 16) | minor | Centre in a card with the icon; secondary variant from G5. **UNVERIFIED** live |

## Conflicts and open questions (not counted as defects)

1. `DESIGN.md` contradicts itself: the front matter uses `#f8f9ff` and `#4648d4`, while the prose asks for a warm cream canvas `#FAF7F2` and periwinkle `#6366F1`. `tokens.css` follows the front matter, which matches the mockups. Confirm the front matter wins.
2. PP1, LB4, LB9 and DK2 are mockup elements the PRD neither requires nor excludes. Each needs a keep-or-drop decision in `docs/decisions.md`.
3. PRD section 9 still lists the profile picker as "Not yet designed" although a mockup exists.

## Summary

| Severity | Count |
| --- | --- |
| blocker | 0 |
| major | 18 |
| minor | 32 |
| flagged for decision | 4 (PP1, LB4, LB9, DK2) |

Major: G1, G4, G5, G5b, G8, G9, PP3, LB3, LB6, DK1, DK3, DK4, PR1, PR3, PR4, PG1, ST1, ST2. G5 and G5b share one fix (a shared Button).

### Defects shared across screens

- **Missing tokens (G8)** block the white card surface, the dark due pill, mint success and a bright bar palette. Fix this first.
- **Flat tinted surfaces (G4)** and **radius (G7)** make every card look unlike the mockups.
- **Secondary button (G5)** is outlined instead of tinted on seven screens, and there is no shared Button (G5b).
- **Grade colours** (PR1, SM1) and **mastery colours in dark** (G9) are all fixed by mapping existing and new tokens, not new design.
- **Icons are missing** on primary actions and nav (G1, G6).

### Suggested order of fixes, by component

1. **Tokens** (`src/ui/tokens.css`): add lowest and highest surfaces, inverse-surface, tertiary, bar colours, one elevation, 2rem radius. Update `tokens.test.ts`.
2. **Button and card primitives** (new, `src/ui`): primary, secondary tinted, icon button; card surface. Replace the repeated class strings (G5, G5b).
3. **`GradeBar`** and **`SummaryView`** chips: box tokens (PR1, PR2, SM1).
4. **`MasteryBar`**: bar tokens, optional percentage (G9, LB8).
5. **`Sidebar`** and layout: logo, icons, profile card, theme control (G1, G2, ST1).
6. **Practice top bar** and **read aloud** icon button (PR3, PR4, PR5).
7. **Deck page**: header row, table, checkbox (DK1, DK3, DK4, DK5).
8. **Library**: Today panel, deck avatar initial, due badge, group header (LB1-LB7, LB10, LB11).
9. **Progress**: tinted tiles, range tray, chart, Focus next and By deck (PG1-PG6).
10. **Settings and Import**: swatch component shared with import, remaining polish (ST2-ST6, IM1, IM2), profile picker (PP2-PP4), error card (ER1).
11. Then capture dark theme for every screen and the **UNVERIFIED** items above before closing the audit.

## Side effects of this audit

- Started a practice session on the Test deck and graded one card "Got it" (local dev data only).
- Created `.claude/launch.json` so the dev server could be previewed; delete it if unwanted.
- Dark theme was switched on for Davi and switched back off.

## Status after the follow-up restyle

Fixed on branch `fix/design-tokens-button`: G1, G2, G6 (icons), LB1, LB2, LB3, LB5, LB6, LB7, LB10, LB11, LB12, DK1, DK3, DK4, DK5, PR1 to PR5, SM1 to SM3, PG1 to PG4, PG6, ST1 (switch affordance), ST2, ST4, ST6, IM1 (partly), IM2, ER1, PP2 to PP4.

Deliberately not done:
- **G3 top bar, LB4 overall mastery, LB9 add-deck tile, DK2 deck-level bar, PP1 picker heading:** need a PRD decision (flagged above).
- **LB8 caption and PG5 by-deck bar and colour dot:** the unit and e2e tests assert the per-bar legend text ("Got it 45"), and the stats API has no per-deck status counts or deck colour.
- **ST1 location:** the theme switch stays in the sidebar (e2e addresses it there); Settings does not duplicate it.
- **ST3 stepper, ST5 preview labels, IM1 back link:** optional; the back link would clash with existing "Library" link locators.
