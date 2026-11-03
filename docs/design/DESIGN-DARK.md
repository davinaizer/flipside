---
name: Nocturne Focus
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c6c5d5'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#908f9e'
  outline-variant: '#454653'
  surface-tint: '#bdc2ff'
  primary: '#bdc2ff'
  on-primary: '#131e8c'
  primary-container: '#818cf8'
  on-primary-container: '#101b8a'
  inverse-primary: '#4953bc'
  secondary: '#ffb783'
  on-secondary: '#4f2500'
  secondary-container: '#df7c27'
  on-secondary-container: '#4c2300'
  tertiary: '#62dcad'
  on-tertiary: '#003827'
  tertiary-container: '#18a479'
  on-tertiary-container: '#003121'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e0e0ff'
  primary-fixed-dim: '#bdc2ff'
  on-primary-fixed: '#000767'
  on-primary-fixed-variant: '#2f3aa3'
  secondary-fixed: '#ffdcc5'
  secondary-fixed-dim: '#ffb783'
  on-secondary-fixed: '#301400'
  on-secondary-fixed-variant: '#713700'
  tertiary-fixed: '#80f9c8'
  tertiary-fixed-dim: '#62dcad'
  on-tertiary-fixed: '#002115'
  on-tertiary-fixed-variant: '#00513a'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display:
    fontFamily: Lexend
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: 3.75rem
    letterSpacing: -0.02em
  display-mobile:
    fontFamily: Lexend
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.875rem
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Lexend
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: 2.875rem
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Lexend
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.375rem
    letterSpacing: 0em
  headline-md:
    fontFamily: Lexend
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.375rem
    letterSpacing: 0em
  headline-sm:
    fontFamily: Lexend
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.875rem
    letterSpacing: 0.015em
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.625rem
    letterSpacing: 0.02em
  body-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: 0.025em
  label-lg:
    fontFamily: Lexend
    fontSize: 0.9375rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-md:
    fontFamily: Lexend
    fontSize: 0.8125rem
    fontWeight: '600'
    lineHeight: 1.125rem
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Lexend
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.03em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
  card: 1rem
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  gutter-lg: 2rem
  margin: 1.5rem
  margin-sm: 1rem
  margin-lg: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Single source of truth

This file and `DESIGN.md` are two themes of one design system. **Only colour, elevation and the card radius differ between them.** Everything else is identical, and the typography, spacing and rounded values in the front matter above are copied from `DESIGN.md` on purpose. If you change one of those in either file, change it in both; `src/ui/tokens.test.ts` fails when they drift.

| Shared in both themes | Per theme |
| --- | --- |
| Typography scale (sizes, weights, line heights, tracking) | Colour tokens |
| Spacing scale and breakpoints | Elevation (light: soft glow, dark: subtle shadow with tonal layers and edges) |
| Radius scale, pill controls, 8px checkboxes | `rounded.card` (light 2rem, dark 1rem) |
| Reading column of 720px for the card | |

The front matter is canonical. The prose below describes it; where a number appears in both, the front matter wins.

## Semantic colour roles

Roles are the same in both themes; only the hue values change. Components use the role, never the name of a hue.

| Role | Token | Used for |
| --- | --- | --- |
| Action | `primary`, `primary-container` | Primary buttons, selected states, "Got it" |
| Attention | `secondary` (warm peach or coral) | "Not yet", lapses, items to revisit |
| Success | `tertiary` (mint or teal) | Mastered, saved, completed |
| Learning | `--box-nearly` (butter or amber) | "Nearly" |
| Error | `error`, `error-container` | Failures and destructive actions |

In the previous version of this file `secondary` was mint and `tertiary` was coral, the opposite of `DESIGN.md`. They are now swapped to match.

## Brand & Style

This theme is the glare-free counterpart of `DESIGN.md`: the same calm, neuro-inclusive, low-cognitive-load interface for long study sessions on a tablet and for dyslexia-friendly reading, with deep slate surfaces and soft pastel highlights instead of a light canvas. It eliminates harsh light bleed while keeping strict visual clarity.

## Colors

The palette is dark-adapted for circadian comfort. Use the front matter values.

- **Surface tiers:**
  - `surface` (`#0b1326`): base canvas, avoiding stark pitch black.
  - `surface-container-low` (`#131b2e`): resting cards and panels (app token `surface-card`).
  - `surface-container` (`#171f33`): default modular panels.
  - `surface-container-high` (`#222a3d`): elevated cards, active flashcard faces, popovers, secondary buttons.
  - `surface-container-highest` (`#2d3449`): dividers and subtle focus states.
- **Accents:** `primary` `#bdc2ff` for interactions and CTAs, `primary-container` `#818cf8` for fills, plus the roles above.
- **Text:** `on-surface` `#dae2fd` for text, `on-surface-variant` `#c6c5d5` for secondary text and labels, `outline` `#908f9e` for metadata. Every text pair must reach 4.5:1 (PRD section 8).

The earlier prose used a different slate palette (`#0f172a`, `#1e293b`, `#334155`, `#818cf8` as primary, `#f8fafc`). It did not match the front matter or the Stitch screens and is retired.

## Typography

Identical to `DESIGN.md`: **Lexend** for titles, stats, buttons and navigation, **Atkinson Hyperlegible Next** for body text, flashcard prompts and explanations. Use the scale in the front matter. Long-form prompt text keeps a line height of 1.6 to 1.7. Paragraph breaks use whitespace, not indents.

## Layout & Spacing

The same grid, breakpoints and spacing scale as `DESIGN.md` (4, 8 and 12 columns; mobile margin `margin-sm`, tablet `margin`, desktop `margin-lg`; gutters `gutter-sm`, `gutter`, `gutter-lg`). The card centres in a reading column of at most `720px` to keep lines at 55 to 70 characters, in both themes. On iPad landscape and desktop the sidebar sits on the left and the study stage on the right. Vertical spacing inside cards uses `space-md` for metadata and `space-lg` between a card's front, back and hint.

## Elevation & Depth

Dark keeps shadows subtle, because heavy ones cause muddy halos on deep slate. Hierarchy comes from **tonal layers** and **subtle luminous edges**, with one soft shadow under cards: `0 4px 16px -2px rgba(0, 0, 0, 0.4)` (the app's `--elevation-card`, defined in both themes under the same name):

- **Level 0 (canvas):** `surface`, matte.
- **Level 1 (decks and panels):** `surface-container-low` with a 1px edge of `rgba(255, 255, 255, 0.06)` (app token `card-edge`).
- **Level 2 (active flashcard):** `surface-container-high` with a 1px edge of `rgba(255, 255, 255, 0.12)`. When active or hovered, an ambient glow `0 0 24px -4px rgba(129, 140, 248, 0.18)`.
- **Level 3 (modals and sheets):** `surface-container-high` with a glow tinted to the role (`tertiary` for success, `secondary` for attention) and a 16px backdrop blur on the mask.
- **Focus:** the same soft ring as `DESIGN.md`, in `primary`, offset by 2px. Never a heavy black or white outline.

## Shapes

The same shape language as `DESIGN.md`; only the card radius differs.

- **Interactive controls (buttons, inputs, badges, tabs):** pill (`rounded.full`).
- **Cards and primary surfaces:** `rounded.card`, `1rem` (16px) in this theme, a tactile handheld-deck feel.
- **Dividers and progress bars:** pill-capped.
- **Checkboxes:** `rounded.sm` squircles (8px) with a high-contrast check; radios are concentric circles.

## Components

Behaviour and copy come from the PRD; this section gives the dark look only.

- **Flashcard stage:** on `surface-container-low`, flipping to `surface-container-high`. Minimum padding `2rem`. The back has a 3px top stripe in `primary-container`.
- **Grade buttons:** the three PRD grades, Not yet, Nearly and Got it, each with an icon, a label and a scheduler sublabel. They use the `--box-not-yet`, `--box-nearly` and `--box-got-it` token pairs (tinted fill, label text matched to the tint, 4.5:1 contrast). The old Again, Hard, Good and Easy keys are not used.
- **Primary button:** `primary` fill with `on-primary` bold text.
- **Secondary button:** tinted `surface-container-high` with `primary` text, borderless (the same pill as light).
- **Ghost button:** transparent with `on-surface-variant` text; hover shifts to `rgba(255, 255, 255, 0.05)`.
- **Chips and tags:** `label-sm`, pill, a fill of `surface-container` or `rgba(255, 255, 255, 0.04)`, optional colour dot for the deck colour.
- **Inputs:** pill, filled with `surface`, a 1px border of `rgba(255, 255, 255, 0.1)`, and a solid `primary` outline on focus.
- **Study progress bar:** segmented line at the top of the study screen: `primary-container` for done, `primary` for current, `surface-container-high` for remaining.
- **Mastery bars:** the app's `--bar-*` tokens, bright against the dark card. Counts are always printed beside the bar, so colour is never the only signal.
