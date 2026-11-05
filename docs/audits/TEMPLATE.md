---
title: <what was audited, a few words>
id: AUD-YYYYMMDD-<slug>
type: over-engineering # over-engineering | security | accessibility | performance | consistency | other
status: draft # draft | open | in-progress | closed
createdAt: YYYY-MM-DD
updatedAt: YYYY-MM-DD
author: <who or what ran the audit>
commit: <short sha audited>
scope:
  - <path>
coverage: full # full | partial
counts:
  high: 0
  medium: 0
  low: 0
  nit: 0
tags: []
---

# <title>

Standard: [README.md](README.md). Read-only: this audit changes no code.

## Summary

<Three to five sentences: what was reviewed, the overall picture, the biggest wins.>

## Findings

### Medium

#### XX-01 <Short claim>

- **Severity:** medium
- **Status:** open
- **Where:** `path/to/file.ts:10-20`
- **Why:** <What is unnecessary or risky, with evidence.>
- **Recommendation:** <One concise action. Say what to keep if only partly right.>

### Low

### Nit

## Not flagged

- <Thing that looks suspect but is justified, and why.>

## Not covered

<Required when coverage is partial. List what was not read.>
