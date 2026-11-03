# Progress

Append-only. One to three lines per task or event: date, task id, what, commit. Read the tail at session start.

- 2026-11-03: v0.3 review backlog started (F9 to F14, PRD D22 to D26). F0 to F8 log archived in docs/archive/v0.2/progress.md.
F9.1 dark theme now sets --elevation-card to 0 4px 16px -2px rgba(0,0,0,0.4) (same token name as light); DESIGN-DARK.md updated; tokens.test.ts checks both themes and no shadow-[...] in src.
F9.2: added shadow-card to the remaining card surfaces (ReadingCard, practice card, settings popover, Progress tiles); tokens.test.ts now fails if any rounded-card or rounded-3xl box lacks it.
