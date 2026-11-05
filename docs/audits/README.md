# Audits

Read-only reviews of the codebase that produce a ledger of findings. An audit changes no code: fixes are separate tasks (`docs/features.json`) that cite the finding id.

- `TEMPLATE.md`: copy this to start a new audit.
- `YYYY-MM-DD-<slug>.md`: one file per audit, named by the day it was created.

## Standard

### Frontmatter

Every audit file starts with YAML frontmatter. The fields below are required unless marked optional.

| Field | Values | Meaning |
| --- | --- | --- |
| `title` | string | What the audit looked at, in a few words. |
| `id` | `AUD-YYYYMMDD-<slug>` | Stable id. Matches the file name. |
| `type` | `over-engineering`, `security`, `accessibility`, `performance`, `consistency`, `other` | The lens. One audit, one lens. |
| `status` | `draft`, `open`, `in-progress`, `closed` | `draft`: being written. `open`: findings published, none acted on. `in-progress`: at least one finding is being fixed. `closed`: every finding is `fixed`, `wont-fix` or `no-change`. |
| `createdAt` | `YYYY-MM-DD` | Day the audit was first written. Never changes. |
| `updatedAt` | `YYYY-MM-DD` | Day of the last edit to the file, including finding status changes. |
| `author` | string | Who or what ran the audit. |
| `commit` | short sha | The commit audited. Line references are valid at this commit only. |
| `scope` | list of paths | What was in scope. |
| `coverage` | `full` or `partial` | `partial` requires a "Not covered" section listing what was skipped. |
| `counts` | `{high, medium, low, nit}` | Findings per severity. Update when findings change. |
| `tags` | list (optional) | Free-form. |

### Severity

Judged by impact on the project, not by effort to fix.

- `high`: a real defect or a risk that is likely to bite (data loss, security hole, wrong results). Fix soon.
- `medium`: complexity or duplication that costs every future change, or a risk that is plausible but unproven.
- `low`: local clutter, unused exports, style slips. Fix when touching the file.
- `nit`: wording, comments, taste. Optional.

### Finding format

Findings sit under one `###` heading per severity (`### Medium`, `### Low`, ...). Each finding is one `####` heading with a stable id, `<PREFIX>-NN`, where the prefix names the audit type (`OE` over-engineering, `SEC` security, `A11Y` accessibility, `PERF` performance, `CON` consistency). Ids are never reused or renumbered, even if a finding is removed.

Heading: `#### OE-01 Short claim`. Then a bullet list with these keys, in this order:

- **Severity:** `high` / `medium` / `low` / `nit`
- **Status:** `open` / `accepted` / `fixed` / `wont-fix` / `no-change`. `accepted` means it will be fixed; add the task id once there is one, for example `fixed (F16.2)`.
- **Where:** `path:line` references, one per location.
- **Why:** what is unnecessary or risky, with evidence from the code, not opinion.
- **Recommendation:** one concise action. Say what to keep if the finding is only partly right.

### Body sections

1. `## Summary`: three to five sentences and the counts.
2. `## Findings`: grouped by severity, highest first.
3. `## Not flagged`: things that look suspect but are justified, with the reason. This stops the next audit repeating them.
4. `## Not covered`: required when `coverage: partial`.

### Rules

- Evidence over opinion: every finding names a location and a reason a reader can check.
- Respect the principles in `CLAUDE.md` (KISS, YAGNI, DRY for rules not shapes). A finding that argues against them needs a reason.
- Update `status` on a finding when work lands, then update `updatedAt`, `counts` and the file `status`.
- Do not edit the findings' wording after publishing, except to fix a wrong line reference or add the fix task id. If a finding was wrong, set it to `no-change` and say why.
