# Design reference

Exported from Google Stitch. **The screens are reference only**: they show layout, spacing and mood. The PRD decides content, behaviour and copy, and the list below is the correct way where a screen differs. Only `DESIGN.md` and `DESIGN-DARK.md` are canonical (visual tokens). Read order for a UI task: the tokens file and existing components first, then the screen. **Some `screen.png` files lag behind their `code.html`** (checked 2026-11-01: profile picker, add deck, answer revealed, session summary and dark practice). Where they differ, the `code.html` text is current; use the PNG for layout only. Each `code.html` is 14 to 37 KB; never copy it.

## Files
- `DESIGN.md` (light theme) and `DESIGN-DARK.md` (dark theme): canonical for visual tokens and components. Each Stitch export re-creates `calm_horizon/` and `nocturne_focus/` folders holding duplicates of these; delete them.
- `stitch_flashcard_learning_app/<screen>/screen.png` and `code.html`, one folder per screen and theme.

## Screens
| PRD screen | Route | Light | Dark |
| --- | --- | --- | --- |
| Profile picker | `/` | `profile_picker` | `profile_picker_dark_mode` |
| Library | `/library` | `library` | `library_dark_mode` |
| Deck | `/decks/[id]` | `deck_detail` | `deck_detail_dark_mode` |
| Practice, question | `/practice/[sessionId]` | `practice_session` | `practice_session_dark_mode` |
| Practice, answer revealed | same | `practice_answer_revealed` | `practice_answer_revealed_dark_mode` |
| Session summary | same | `practice_session_summary` | `session_summary_dark_mode` |
| Progress | `/progress` | `progress` | `progress_dark_mode` |
| Settings | `/settings` | `settings` | `settings_dark_mode` |
| Add or re-import deck | `/import` | `add_deck_re_import` | `add_deck_re_import_dark_mode` |
| Import success | `/import` | `import_success` | `import_success_dark_mode` |
| Library, empty | `/library` | `empty_library` | `empty_library_dark_mode` |
| Library, loading | `/library` | `loading_skeleton` | `loading_skeleton_dark_mode` |
| Error with retry | any | `error_with_retry` | `error_with_retry_dark_mode` |

## Known deviations: the PRD wins
The light and dark screens were generated separately and differ in content. Where they disagree, follow the PRD and the light screen's structure.
1. **Grades are exactly three:** Not yet, Nearly, Got it, with scheduler sublabels ("Again today", "Tomorrow", "In 3 days"). Ignore "Again / Hard / Good / Easy" in the `practice_session_dark_mode` code and "Repeat soon / Review in 1d" in `practice_session`.
2. **No sync wording:** omit "Synced", "Saved on this iPad", "Next auto-sync" and "Local iPad database" (storage is the home server).
3. **Not in the MVP, omit:** Edit card, Star for review, Review all answers, "Focus clue" lines, Start Cram Session, "Critical" tag, Retention, estimated time, "Scheduled repeat: 10 mins", "Spaced Repetition V2 / Protocol", the "Key takeaways / 3 principles / Recall test" labels and the second topic chip on the answer card. Answer text is the card's paragraph or bullet list, with no second-level explanation lines.
4. **Undo:** "Undo flip" becomes "Undo last", available after a grade (R6).
5. **Progress:** the second tile is Got it rate (first attempts), not "Mastered". Focus next and the by-deck order use mastery, and say so.
6. **Profile picker:** omit the "Reading & Dyslexia Preferences" button. The deck and due counts on the cards need a cross-profile query; omit them unless the PRD is changed (P4).
7. **Theme names must not appear in the UI:** "Calm Horizon", "Calm Focus". Also omit the "Target: iPad Landscape 1180x820" annotation.
8. **Settings:** the font is "System Sans" (the light screen says Arial). The practice popover's "Warm" tint and "1.0x" speed do not match T1 and T2; the popover is optional (R13).
9. **Contrast:** the Nearly and Not yet labels on their tinted buttons look below 4.5:1. Darken the label tokens; AC12 will confirm.
10. Sample data and the profile block differ between screens and are illustrative.
11. `code.html` loads Tailwind, fonts and logo images from CDNs. Do not copy that: fonts are bundled and nothing is requested from third parties (PRD section 8). The logo image in the new state screens is broken; use the app logo.
12. **Online only:** omit every offline claim ("offline study space", "Offline-ready", "practice offline", "Switch to an offline profile"). Data is saved on the home server; say "Saved", not "device storage", "local storage" or "local repository". No sync wording either ("synced seamlessly", "Synced with home server").
13. **Error screen:** plain language: we can't reach the home server, your cards and progress are safe, check you are on the home Wi-Fi, then Retry or Switch profile. Omit error codes, ports, hostnames, attempt counters, hardware advice, "study streaks" and "Automatic Reconnect / resume your session" (not built; Retry reloads).
14. **Empty Library:** one call to action, "Add deck", plus "Download CSV template". Required CSV columns are topic, front and back (PRD section 6). No in-app card creation. Replace the marketing tiles ("Dyslexia-friendly reading", "100% private", "Works completely offline") with one plain line on how to add cards.
15. **Import success:** deck name, cards added and updated, and the two actions. Omit Box and Leitner wording ("Initial Placement", "Leitner Level"); new cards follow the daily cap.
16. **Navigation:** the sidebar highlights the section being shown. The error and empty screens highlight Progress; it should be Library.
17. **Progress copy:** subtitle and Focus next say mastery, not "retention". Omit "Consistent practice builds lasting retention".
18. Hidden states in `practice_session` and `practice_session_dark_mode` still hold the old grade labels; see item 1. Several PNGs lag their `code.html` (profile picker, add deck, answer revealed, session summary, empty Library, dark practice); the PRD and this list win over both.
