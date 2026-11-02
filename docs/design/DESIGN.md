---
name: Calm Horizon
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#464554'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#8e4e14'
  on-secondary: '#ffffff'
  secondary-container: '#ffab69'
  on-secondary-container: '#783d01'
  tertiary: '#00685d'
  on-tertiary: '#ffffff'
  tertiary-container: '#008376'
  on-tertiary-container: '#f4fffb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#ffdcc4'
  secondary-fixed-dim: '#ffb780'
  on-secondary-fixed: '#2f1400'
  on-secondary-fixed-variant: '#6f3800'
  tertiary-fixed: '#8cf5e4'
  tertiary-fixed-dim: '#6fd8c8'
  on-tertiary-fixed: '#00201c'
  on-tertiary-fixed-variant: '#005048'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
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
  card: 2rem
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

## Brand & Style

This design system is crafted around neuro-inclusive empathy, sensory gentleness, and focused educational clarity. Designed primarily for learners, educators, and readers who benefit from low-cognitive-load environments, the visual atmosphere balances structure with soft warmth.

The aesthetic is built upon modern soft minimalism paired with warm pastel ambient tinting. Harsh pure whites and clinical grays are completely eliminated in favor of soothing, low-glare surfaces that actively reduce visual stress and accommodate readers with dyslexia or light sensitivity. Interfaces feel open, tactile, and pillowy, evoking an emotional state of safety, focus, quiet joy, and unhurried progress.

## Colors

The color palette avoids high-frequency pure black and pure white extremes. The canvas uses a warm, low-glare cream foundation (`#FAF7F2`), moving through pastel layers designed to delineate content without sharp, abrasive boundaries:

- **Primary (Pastel Periwinkle / Iris):** `#6366F1` anchors primary calls-to-action, structural wayfinding, and active focus boundaries, supported by surface tints of `#EEF2FF`.
- **Secondary (Warm Peach / Coral):** `#F4A261` introduces welcoming highlights, encouragement markers, and streak/progress accents, backed by soft tints of `#FFF4ED`.
- **Tertiary (Soft Mint / Sage):** `#2A9D8F` provides organic balance, success verification, and quiet completion cues, matched with subtle mint washes of `#EFF8F6`.
- **Accent Tints (Lavender & Buttercream):** Soft lavender (`#F3E8FF`) and gentle buttercream (`#FEF9C3`) serve as contextual surface washes for categorical categorization and study cards.
- **Neutrals (Slate Tinted Grounding):** Primary text rests at a high-legibility dark slate (`#1E293B`) rather than pure `#000000`, preventing harsh optical vibration against pale pastel backgrounds. Subdued metadata relies on `#64748B`.

## Typography

Typography prioritizes hyper-legibility, visual pacing, and neurological reading ease.

- **Headlines & Labels (`Lexend`):** Specially engineered to reduce cognitive strain and visual crowding, Lexend creates open, distinct word silhouettes for headers, badges, button text, and quick-scan UI anchors.
- **Body & Longform (`Atkinson Hyperlegible Next`):** Implements unambiguous character disambiguation (such as distinct glyph shapes for `I`, `l`, `1`, `0`, and `O`). Generous x-heights, balanced counterforms, and expanded default line-heights prevent "word crowding" and visual swimming.
- **Typographic Rules:** Paragraphs should never exceed 65 characters per line to minimize tracking drift. Avoid justified text alignment; maintain ragged-right alignment to give readers clear line anchors.

## Layout & Spacing

The layout is built around an airy fluid-grid philosophy that naturally breathes. High-density interfaces are avoided; content clusters are grouped into generous cards separated by ample breathing room.

- **Breakpoints & Grids:**
  - **Mobile (<768px):** 4-column layout with `1rem` margins and `1rem` gutters. Stacks interactive elements full-width for comfortable touch targeting.
  - **Tablet (768px - 1024px):** 8-column layout with `1.5rem` margins and `1.5rem` gutters. Dual-pane view for syllabus and active reading.
  - **Desktop (>1024px):** 12-column layout with a strict maximum container width of `1200px` to maintain comfortable eye-span, framed by `3rem` margins and `2rem` gutters.
- **Spacing Rhythm:** Vertical spacing leans on `space-lg` (`1.5rem`) and `space-xl` (`2.5rem`) to create natural cognitive resting pauses between lesson steps and module groups.

## Elevation & Depth

This system avoids dark drop-shadows and stark high-contrast borders, relying instead on **tonal pastel layering** and **colored ambient diffusion**.

- **Canvas Foundation:** Tinted resting base (`#FAF7F2`) serves as Ground Zero.
- **Surface Elevation 1 (Resting Cards):** Pure off-white containers (`#FFFFFF` with 90% opacity over the warm ground) accented with a soft outer atmospheric glow: `0px 8px 24px -4px rgba(99, 102, 241, 0.06)`.
- **Surface Elevation 2 (Interactive Floating Cards / Menus):** Subtle 1px translucent boundaries (`rgba(99, 102, 241, 0.1)`) complemented by a gentle dual-tint ambient shadow: `0px 12px 32px -6px rgba(244, 162, 97, 0.08), 0px 4px 12px -2px rgba(99, 102, 241, 0.05)`.
- **Active Focus Elevation:** Raised elements never use heavy black outlines. Focus state relies on a soft 3px periwinkle ring (`rgba(99, 102, 241, 0.35)`) offset by 2px.

## Shapes

The geometric vocabulary is overtly organic, welcoming, and friendly, utilizing continuous pill curves and generously rounded containers.

- **Interactive Controls (Buttons, Inputs, Badges, Tabs):** Fully pill-shaped (`9999px` border radius). This removes visual tension and provides clear tactile touch affordances.
- **Containers & Content Cards:** Large curved radii (`2rem` / `rounded-lg` up to `3rem` / `rounded-xl` for featured educational cards). Sharp 90-degree corners are systematically banned to eliminate visual agitation.
- **Dividers & Progress Bars:** Rendered with pill-capped endpoints (`rounded-full`) to maintain an approachable, gentle silhouette throughout all linear metrics.

## Components

### Buttons
- **Primary Pill:** Background in periwinkle (`#6366F1`) with white text, fully rounded (`rounded-full`), padded with `0.875rem` vertical and `1.75rem` horizontal. On hover: smooth shift to `#4F46E5` with a warm glow.
- **Secondary Tinted:** Lavender wash surface (`#EEF2FF`) with primary indigo text (`#4338CA`), completely borderless, maintaining identical pill dimensions.
- **Affirmative Action:** Soft Mint background (`#2A9D8F`) with white text for completed milestones and save states.

### Cards & Lesson Modules
- Base structure features `2rem` border radius (`rounded-lg`), padded with `space-lg` to `space-xl`.
- Card variants are color-tinted according to subject mode:
  - *Reading & Language:* Lavender surface (`#F8F5FF`) with soft violet accents.
  - *Creativity & Discovery:* Warm Peach wash (`#FFF7F2`) with subtle coral details.
  - *Logic & Science:* Soft Mint surface (`#F0FAF8`) with muted teal accents.
- Inner margins provide generous padding so text never crowds card perimeters.

### Input Fields
- Pill-shaped (`rounded-full`) text fields with low-glare warm cream filling (`#F5F0E8` or pure `#FFFFFF`), 1.5px subtle periwinkle boundary, and `1rem` vertical padding.
- Assistive placeholder text set in medium-weight slate (`#94A3B8`) ensuring clear readability without harsh contrast.

### Chips & Tags
- Compact pills (`rounded-full`) featuring `0.375rem` vertical and `1rem` horizontal padding.
- Default to pastel fills (such as buttercream `#FEFCE8` or blush `#FFE4E6`) with dark matching glyphs and text, signaling status or topic tags without visual alarm.

### Checkboxes & Radio Controls
- Radio controls are dual concentric circles with soft periwinkle active states.
- Checkboxes use gentle squircles (`rounded-md`, 8px radius) with soft teal check indicators upon selection, replacing aggressive square boxes.

### Audio & Dyslexia Tooling Bar
- Floating bottom-docked pill control bar containing dyslexia font scaling toggles, audio narration triggers, and line-focus rulers. Floating dock utilizes tinted glassmorphism (`rgba(250, 247, 242, 0.85)` with `16px` backdrop blur) to sit peacefully over primary learning content.
