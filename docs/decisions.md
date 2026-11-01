# Implementation decisions

Product decisions live in docs/PRD.md section 18. This file holds what happens while building.

- `ASSUMED: <what, why>` is logged by a worker that took a PRD-stated default. The user reviews these in the PR.
- `ANSWER (<task id>): <question> -> <answer>` records what the user decided when a worker was blocked.

ANSWER (F0.3): Which container runtime? -> Podman instead of Docker (PRD D20). `podman compose` needs a separately installed provider, so scripts call `podman run` directly.
ANSWER (F3.8): Where is the school deck? -> Supplied in `res/`; its zip keeps images under `images/` while the CSV names bare files, so image names match by base file name.
ASSUMED: settings ids (atkinson, lexend, system; textSize 1-4, spacing 1-3, default card colour mist) and newCardsPerDay max 100, since the PRD names options without ids.
