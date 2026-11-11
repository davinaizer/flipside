# Architecture decision records

One file per decision. Accepted ADRs are not edited: a changed decision gets a new ADR and the old one is marked `Superseded by ADR-NNN`.

## When to write one

When a decision is hard to reverse or sets a pattern others will copy: a layer rule, a shared helper everyone must use, a dependency, a data shape. Write it when the decision is made, not in advance. Small choices stay in `docs/decisions.md` (ASSUMED and ANSWER entries). Product decisions stay in `docs/PRD.md` section 18.

An ADR is the "why". Where a rule can be checked by a tool, the ADR names the check (lint rule, test, script) so a violation fails the build instead of waiting for a review.

Use [000-template.md](000-template.md). Add the new record to the index below.

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [001](001-enforce-boundaries-in-lint.md) | Layer boundaries and shared helpers are enforced by lint | Accepted |
| [002](002-host-on-vercel.md) | Host on Vercel Hobby with Neon and Vercel Blob | Proposed |
| [003](003-own-email-password-auth.md) | Own email and password authentication over Node crypto | Proposed |
