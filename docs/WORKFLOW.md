# Agentic workflow

How agents build Flipside. Product scope is `docs/PRD.md`; this file is authoritative for the process. Change it first, then the agents and skills that depend on it.

## How to run
1. `/plan-backlog`: fills the task lists in `docs/features.json`. You review the summary once.
2. `/run-feature`: shows a summary of what it will build and waits for your confirmation, then builds the feature and merges its PR. `/run-feature F3` targets one; `/run-feature all` continues feature after feature.
3. Answer the questions it asks. Features merge into `main` by themselves once the gate passes; review the merged PRs, the ASSUMED log and the manual checklist afterwards.

## Vocabulary
Process words (feature, task, ledger, gate, finding, ASSUMED, ANSWER, BLOCKED, attempt, loop guard, learned fact) and product words are defined once, in `docs/GLOSSARY.md`. Agents use those words and no others; a concept without a row gets one in the same change. The reviewer checks this at the feature gate.

## Roles
| Role | Model | Defined in | Job |
| --- | --- | --- | --- |
| Orchestrator | Opus (project default) | `.claude/skills/run-feature` | Picks tasks, briefs workers, asks you, runs the feature gate, opens the PR |
| Implementer | Sonnet; Opus where a task says `model: opus` | `.claude/agents/implementer.md` | One task: plan, implement, verify, commit, report |
| Reviewer | Opus, fresh context, read-only | `.claude/agents/reviewer.md` | One review per feature against its requirements and ACs |

Subagents cannot ask you questions. Workers return `STATUS: BLOCKED` with options and a recommendation; the orchestrator asks.

## State on disk
Agents are stateless between sessions; these files are the memory.
- `docs/features.json`: ledger of features, tasks, status, PRs.
- `docs/progress.md`: append-only log. Read the tail at session start.
- `docs/decisions.md`: assumptions workers made and answers you gave.
- `docs/PRD.md` section 18: product decisions.
- `git log`.

## Resuming
`/run-feature` can be cancelled and run again. A cancelled run loses at most the task in flight.
- The feature in progress is the one with an unmerged `feat/<id>-*` branch. Its ledger lives on that branch; `main` only learns about it at the merge.
- A dirty tree after a cancel is the interrupted task: the orchestrator asks whether to keep or discard it.
- Each review result is logged in `docs/progress.md`, so rounds are counted and a PASS is not repeated. An existing PR is reused.
- GitHub decides whether a feature is merged, not the ledger.
- Any other open PR into `main` is raised at the start of a run, because neither the ledger nor a clean tree shows it. The orchestrator asks whether to merge it first or carry on.

## Gates
- **Task gate (every task):** `bash scripts/verify.sh` green, then one commit. Deterministic, no extra agent.
- **Feature gate:** verify, e2e and axe for the feature's screens, then one fresh Opus review. Max two review rounds, then it asks you.
- **Merge condition:** verify, e2e and axe green, reviewer PASS, all tasks done, PR base `main`. Any failure means no merge and a question to you.
- **Definition of ready (before a task starts):** it has an id, `reqs`, `prd_sections`, `area` and a `done_when` that is a test or a check; every task it depends on is `done`; no stop rule is open on it. A task that fails this goes back to `/plan-backlog`, not to a worker.
- **Done:** all ACs that agents can verify pass. `manual_acs` (AC10 read-aloud on the iPad, AC11 reboot and restore) are logged as `MANUAL PENDING` and listed in the final report for you.
- **CI:** `.github/workflows/checks.yml` repeats verify and e2e on GitHub for every pull request into `main`, against the merged result. PRs that change only `docs/**` or `*.md` files skip it. It does not replace the local gates and blocks a merge only if branch protection requires it, so read it before merging.
- **Stop hook:** a turn that leaves changed code with red checks cannot end.

## Visibility
`scripts/statusline.sh` is the Claude Code status line. Line one comes from the ledger: feature, task progress and stage. Line two is the session: model, context, tokens and time. Context is the orchestrator's own window, not the current subagent's.

## Stop rules
Kept in `CLAUDE.md` so every agent loads them. Everything outside them is logged as ASSUMED and reviewed in the PR.

### Loop guard (stop rule 4)
The guard keeps an agent from repeating a fix that does not work. It is a rule the agent follows, not a tool, so the terms are exact:
- **Attempt:** one change followed by a rerun of the check that failed. Reading, planning and running other checks are not attempts.
- **Same failure:** the same check failing with the same error, judged by the failing test name or error message, not by the line number.
- **Limit:** two attempts on the same failure. A different failure restarts the count. A passing run closes the count.
- **On the limit:** revert uncommitted changes so the tree is clean, then report `STATUS: BLOCKED` with the check, what each attempt changed, the last error, two or three options and one recommendation. The orchestrator asks the user. It does not try a third time, and it does not lower, skip or widen a check to get past it.
- **At the feature gate:** the same limit applies to review: two rounds, then the orchestrator asks.

### Learned facts
When a worker loses two attempts to a repo fact it could have known (a command, a port, an environment detail, a tool quirk), and then finds it, it logs `LEARNED: <fact, how to apply>` in `docs/decisions.md`. The user reviews these with the ASSUMED lines. A fact that proves durable moves to `CLAUDE.md` or a script; one that proves wrong is deleted. Nothing is injected into a prompt automatically: a human decides what becomes a rule.

## Branches and PRs
One PR per feature, always targeting `main`, merged by the orchestrator with a merge commit (keeps the per-task commits) once the merge condition holds. The next feature branches from the updated `main`. Human review happens after the merge, and any feature can be undone with `git revert -m 1 <merge sha>`. Agents never push to `main` directly (deny rules in `.claude/settings.json`); merging goes through `gh pr merge`. If `main` has branch protection that requires a review, the merge fails and the run asks you.

## Concurrency
One lane. Add a second only if two features touch disjoint paths, need no migration, and run in separate worktrees with their own database name and ports. A worktree branches from the repository's default branch (`main` here, not `develop`), so check that before using one. Not enabled until the pilot shows a need.

## Cost and speed
- Fresh context per subagent; briefs carry a task id and PRD section numbers, never the whole PRD.
- Heavy checks (e2e, axe, review) once per feature, not per task.
- Run `/usage` after F0 and after the first real feature. Set an account spend limit before `all`.

## Pilot and review of this workflow
Run F0 and F1 one lane at a time. Compare tokens, wall-clock time and number of stops. Change this file only against what you observe: add a second lane if waiting dominates, add per-task review if bugs slip past the feature reviewer, move more tasks to Opus if Sonnet output keeps failing review.
