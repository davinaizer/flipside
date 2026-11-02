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
  secondary: '#62dcad'
  on-secondary: '#003827'
  secondary-container: '#18a479'
  on-secondary-container: '#003121'
  tertiary: '#ffb783'
  on-tertiary: '#4f2500'
  tertiary-container: '#df7c27'
  on-tertiary-container: '#4c2300'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e0e0ff'
  primary-fixed-dim: '#bdc2ff'
  on-primary-fixed: '#000767'
  on-primary-fixed-variant: '#2f3aa3'
  secondary-fixed: '#80f9c8'
  secondary-fixed-dim: '#62dcad'
  on-secondary-fixed: '#002115'
  on-secondary-fixed-variant: '#00513a'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#713700'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Lexend
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 52px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Lexend
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Lexend
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Lexend
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: 0em
  headline-sm:
    fontFamily: Lexend
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
    letterSpacing: 0.01em
  body-xl:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 22px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: 0.02em
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 30px
    letterSpacing: 0.02em
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0.015em
  body-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0.015em
  label-lg:
    fontFamily: Lexend
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Lexend
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.025em
  label-sm:
    fontFamily: Lexend
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-tablet: 2rem
  gutter-desktop: 2.5rem
  margin: 1.25rem
  margin-tablet: 2.5rem
  margin-desktop: 4rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 2rem
  space-xl: 3rem
---

## Brand & Style

This design system is tailored for an immersive, glare-free, and neuro-inclusive learning environment. Rooted in mindful minimalism with soft tactile nuances, it prioritizes cognitive ease, non-fatiguing contrast, and frictionless readability during intensive study and spaced-repetition sessions.

The aesthetic is quiet, atmospheric, and distinctly luminous against dark surfaces. By pairing deep slate backgrounds with soothing, milky pastel highlights, the interface eliminates harsh light bleed while maintaining strict visual clarity. It emphasizes low cognitive overhead, generous spatial breathing room, and structured information hierarchy designed specifically for tablet touch interactions and dyslexia-friendly reading patterns.

## Colors

The palette is engineered around dark-adapted circadian comfort and accessible chromatic feedback:

- **Surface Tiers:**
  - `canvas`: `#0f172a` (Base environment, eliminating stark optical pitch black while grounding depth)
  - `surface-container`: `#1e293b` (Default card states, modular panels)
  - `surface-container-high`: `#334155` (Elevated cards, active flashcard faces, popovers, active sheets)
  - `surface-container-highest`: `#475569` (Dividers, borders, subtle interactive focus states)

- **Luminous Accent Palette:**
  - `primary` (`#818cf8` / Periwinkle Indigo): Core brand interactions, deck categories, primary CTAs.
  - `secondary` (`#6ee7b7` / Soft Mint): Mastery, positive recall ("Easy"), validated responses.
  - `tertiary` (`#fb923c` / Pastel Coral): Review flags, lapse state ("Hard"), critical attention items.
  - `accent-amber` (`#fcd34d` / Pastel Butter): Learning progression, intermediate recall ("Good"), streak counters.
  - `accent-lavender` (`#c084fc` / Soft Lavender): Meta-tags, study analytics, audio/pronunciation controls.

- **Typography & Content Contrast:**
  - `text-primary`: `#f8fafc` (Slate 50, crisp and anti-glare)
  - `text-secondary`: `#cbd5e1` (Slate 300, clear contextual labels)
  - `text-muted`: `#94a3b8` (Slate 400, meta info, inactive keys)

## Typography

The typographic system addresses reading endurance and dyslexia accessibility through intentional pairings:

- **Lexend** governs titles, stats, buttons, and navigation. Its hyper-regularized proportions and widened letter spacing minimize visual crowding and cognitive friction.
- **Atkinson Hyperlegible Next** powers all body text, flashcard prompts, and explanations. Character forms feature unambiguous distinctions between traditionally mirrored or confusing glyphs (e.g., `b`/`d`, `p`/`q`, `I`/`l`/`1`).
- Line-height across long-form prompt text is expanded to 1.6x–1.7x to prevent line-jumping during prolonged iPad study. Paragraph breaks require deliberate whitespace over indents.

## Layout & Spacing

The layout is built around a focused, centered content architecture that shifts seamlessly between iPad orientation regimes and desktop viewports:

- **Touch & Focus Shell:** Flashcards center strictly along a maximum reading column width of `720px` to keep line lengths within 55–70 characters.
- **Adaptive Canvas:**
  - **Phone (< 768px):** Single-column stacked mode with persistent bottom action controls, `margin: 1.25rem`.
  - **iPad Portrait (768px – 1024px):** Single focal study view with floating deck inspector drawers, `margin: 2.5rem`.
  - **iPad Landscape & Desktop (> 1024px):** Dual-zone layout with an expansive review stage on the right and an index sidebar on the left, `gutter: 2.5rem`.
- **Rhythm Rules:** Vertical spacing within cards uses `space-md` for metadata and `space-lg` to separate card fronts from backs or hints, maintaining clear focal separation.

## Elevation & Depth

This design system avoids traditional drop shadows, which cause muddy halo artifacts and optical vibration against deep slate backdrops. Instead, spatial hierarchy is constructed using **Tonal Layers** combined with **Subtle Luminous Tint Borders**:

- **Level 0 (Canvas Base):** `#0f172a`, completely matte.
- **Level 1 (Decks & Panels):** Surface `#1e293b` paired with a 1px border of `rgba(255, 255, 255, 0.06)`.
- **Level 2 (Active Flashcard Surface):** `#334155` complemented by a 1px perimeter highlight of `rgba(255, 255, 255, 0.12)`. When active or hovered, an ambient pastel glow is applied: `0 0 24px -4px rgba(129, 140, 248, 0.18)`.
- **Level 3 (Modals, Overlays, and Sheets):** Surface `#334155` with an ambient glow tinted to the semantic action color (`rgba(110, 231, 183, 0.15)` for success; `rgba(251, 146, 60, 0.15)` for warning) and a backdrop blur of `16px` on the underlying slate mask.

## Shapes

The geometric personality features soft, ergonomic curves that feel organic and comfortable during long touch interactions:

- **Cards & Primary Surfaces:** `1rem` (16px) corner radius, generating a tactile, handheld card deck aesthetic.
- **Action Buttons & Response Pills:** `0.75rem` (12px) to full capsule/pill shapes (`9999px`) for quick-tap rating controls.
- **Inputs & Badges:** `0.5rem` (8px) radius for compact data presentation.
- **Interactive Affordance:** Card edges maintain a consistent geometric continuity without sharp vertexes, preventing eye fatigue during screen scanning.

## Components

- **Flashcard Stage (Core Component):**
  - Built on `#1e293b` flipping to `#334155`.
  - Enforces minimum padding of `2rem` on all viewports.
  - Features an intuitive 3D flip transform with perspective. Card back displays a top anchor accent stripe (3px tall) tinted in `primary` (`#818cf8`) or `accent-amber` (`#fcd34d`).

- **Buttons & Response Controls:**
  - **Spaced-Repetition Grade Keys:** A 4-button array anchored at the bottom (`Again`, `Hard`, `Good`, `Easy`) styled with tinted pill backgrounds (`rgba(color, 0.12)`), text matched to the respective pastel, and a 1.5px border matching the accent tint.
  - **Primary Action Buttons:** Solid `#818cf8` with `#0f172a` bold text to ensure maximum contrast and tap feedback.
  - **Ghost/Tertiary Buttons:** Transparent background with `#cbd5e1` text and hover states shifting to `rgba(255, 255, 255, 0.05)`.

- **Chips & Tags:**
  - Rendered in `label-sm` with uppercase styling.
  - Composed of `#0f172a` or `rgba(255, 255, 255, 0.04)` fill with colored dot indicators matching deck categories (Mint, Lavender, Butter, Coral).

- **Form Controls (Inputs, Checkboxes, Toggles):**
  - **Input Fields:** Filled with `#0f172a`, bordered with `rgba(255, 255, 255, 0.1)`, transitioning to a solid `#818cf8` outline on focus without heavy shadow spread.
  - **Checkboxes & Radios:** `0.375rem` rounded boxes with high-contrast pastel fills and deep slate check glyphs.
  - **Touch Sliders / Audio Progress:** Track rendered in `#334155`, active progress bar filled in `#818cf8`, thumb oversized (28px) for iPad touch ergonomics.

- **Study Progress Bar:**
  - Segmented multi-tone line at the top edge of the study screen showing review composition: Mint (mastered), Amber (learning), Coral (needs review).
