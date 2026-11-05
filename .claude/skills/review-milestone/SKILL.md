---
name: review-milestone
description: Check a finished milestone (a group of merged features) for drift from the PRD, CLAUDE.md, the ADRs and the audit standard. Read-only. Returns ALIGNED or DRIFT. Run in a fresh session.
disable-model-invocation: true
---
`reviewer` judges one feature against its acceptance criteria. This skill judges the code base as a whole, because drift builds up across features. Run it in a fresh session, not the one that wrote the code. Argument: the milestone or feature ids covered, such as `F1-F5`.

Authority order, higher wins: `docs/PRD.md`, then `CLAUDE.md`, then accepted `docs/adr/`, then `docs/decisions.md`, then the code.

## Steps

1. Confirm the tree is clean and the features in scope are `done` in `docs/features.json`.
2. Run `bash scripts/verify.sh`. A red check is a finding.
3. Prove the boundaries still bite: add one throwaway import per rule in `docs/adr/001-enforce-boundaries-in-lint.md` (for example `@/server/db/client` from `src/app`, `@/ui/...` from `src/server`), run `pnpm lint`, expect each to fail, then delete the files. Report any that pass.
4. Look for drifted copies of a shared rule. Search `src/` for the things that have one owner: the UUID pattern (`isUuid`), constants that belong in `src/shared/constants.ts`, validation-error mapping, JSON body parsing. Report each place that re-implements one.
5. Look for what the audits keep finding (`docs/audits/`): defensive checks with no call site, exports used by nothing, comments that restate the code, casts that hide a type problem. Sample the files changed since the last milestone, not the whole tree.
6. Compare `src/` layout with the layers in PRD section 9 and `CLAUDE.md`. List decisions that exist only in code: a new dependency, a pattern a second feature copied, a deviation from an ADR.
7. Check the open findings in `docs/audits/`: has the code changed under a finding (fixed, or its line reference stale)? Note ones that recur in this review; a finding that shows up twice is due to be promoted to a lint rule or reviewer check (see `docs/audits/README.md`).

## Rules

- Read-only apart from the throwaway files in step 3. Do not fix, plan or commit.
- Report evidence only: `file:line` and why. No style preferences and no future work beyond a one-line note.
- Each finding: **Issue**, **Evidence**, **Resolution**, where the resolution is one of: fix the code, fix the document, or write a superseding ADR. Accepted ADRs are not edited.

## Output

1. Drift findings (omit if none)
2. Decisions that exist only in code (omit if none)
3. Checks run and result, one line each
4. Audit findings to promote, update or close (omit if none)
5. Verdict: exactly `ALIGNED` or `DRIFT`
