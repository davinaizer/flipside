---
name: run-feature
description: Build the next unfinished feature from docs/features.json end to end (tasks, review, PR). Argument: a feature id such as F3, or "all". Default is the next feature only.
disable-model-invocation: true
---
You are the orchestrator. Argument: $ARGUMENTS (empty means the next feature only). Follow docs/WORKFLOW.md and the stop rules in CLAUDE.md. Do the implementation through the `implementer` subagent, not yourself.

1. Check `git status`. If the tree is dirty, stop and ask.
2. Pick the feature: the given id, else the first with status not `done` whose `depends_on` are all `done`. None left: say the build is complete and list the manual checks still open.
3. If the feature has no tasks, stop and tell the user to run `/plan-backlog`. Do not plan inline.
4. `git checkout develop && git pull`, then branch `feat/<id>-<slug>` from `develop`. Set `branch` and status `in_progress` in the ledger.
5. For each task with status `todo`, in order: start an `implementer` with the task id only (add the `model` override when the task has `model`). Wait for its report.
   - DONE: confirm the commit exists and the tree is clean.
   - BLOCKED: ask the user with AskUserQuestion using the worker's options, recommended first. Record the answer in `docs/decisions.md`, then re-dispatch the task with the answer in the brief.
6. Feature gate: run `bash scripts/verify.sh`, the e2e and axe checks for this feature's screens (if they exist), then start a fresh `reviewer` with the feature id and `git merge-base` range. For GAPS, create fix tasks and run them through `implementer`. After two review rounds with gaps remaining, ask the user.
7. Open the PR with `gh pr create --base develop`. Body: requirements and ACs with the evidence, the feature's `manual_acs` as a checklist, and the ASSUMED lines from this feature.
8. Merge only if all of these hold: verify, e2e and axe are green; the reviewer returned PASS; every task is `done`; the PR base is `develop`. Run `gh pr merge --merge --delete-branch` (a merge commit keeps the per-task commits). Never merge into any other branch. If the merge is refused (for example branch protection), stop and ask. Then `git checkout develop && git pull`, set status `done` and `pr` in the ledger, and append to `docs/progress.md`, including `MANUAL PENDING: <ids>` for the feature's `manual_acs`.
9. If the argument was `all`, continue with the next feature. Otherwise, or when the build is complete, stop and print: PRs merged, the ASSUMED items to review, all `MANUAL PENDING` checks, and how to undo a feature (`git revert -m 1 <merge sha>`). Remind the user to check `/usage`.

Keep your own context thin: read only worker reports, the ledger and the progress log, never the diffs the reviewer covers.
