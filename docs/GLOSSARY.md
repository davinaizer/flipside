# Glossary

The one owner of Flipside's vocabulary. Use these terms, and only these, in code, docs, UI copy, commit messages, PRs and anything an agent writes (artifacts included). Behaviour and rules stay in `docs/PRD.md`; this file says what each word means and which words not to use.

## How to use it

- **Use the canonical term.** If a concept has an entry, do not invent a synonym. The **Avoid** column lists the ones already rejected.
- **A new concept gets an entry first.** Add the row in the same change that introduces the word, with all five columns filled. A reviewer flags a term the diff coins for something already named here.
- **A rename changes this file and every use in one change.** Do not leave the old word behind in code, docs or UI.
- **Meaning, not behaviour.** A definition is one sentence. If it needs a rule, link the PRD section.
- **Identifiers keep their form.** `snake_case` in the database, `camelCase` in TypeScript, kebab-case in URLs. The terms below fix the word, not the casing.
- **Different layers may name the same concept differently on purpose.** The UI label is user copy; the code name is an identifier. Both are listed so neither drifts.

## Product terms

| Term | Definition | Avoid | In code | In UI |
| --- | --- | --- | --- | --- |
| Profile | A person's identity inside the app: name, avatar, settings, decks and progress. Nothing is shared across profiles (PRD section 2). | user, account, learner (as a noun for the record) | `profiles`, `profileId` | "profile"; picker button "Add User" (see Flagged ambiguities) |
| Learner | The person practising. A role in sentences, never a record or identifier. | student, pupil, user | not used | not used |
| Deck | A named collection of cards on one subject, owned by one profile. | set, collection, pack | `decks`, `deckId` | "deck" |
| Topic | A label inside a deck that groups cards, for example "7F Chemical reactions". Topics live per deck. | category, chapter, unit, tag | `topic` on `cards` | "topic" |
| Card | One question (front) and its answer (back), optionally with images. | flashcard, item, note | `cards`, `cardId` | "card" |
| Question / Answer | The front and back of a card. | prompt, term, definition | `front`, `back` | "Question" label |
| Box | One of five steps in the schedule (1 to 5). A higher box is reviewed less often. | level, bucket, stage | `box` | "box" |
| Due | A card is due when its due date is today or earlier on the profile's local day. | overdue (unless a card is past its date), pending | `dueDate` | "due" |
| Practice session | One run over a queue of cards, from the first card to the summary or End session. | session (alone), round, quiz, test | `sessions`, `sessionId`, `/sessions` | "session" in practice screens |
| Queue | The ordered list of attempts in one practice session, including re-queued ones. | playlist, stack, deck (of the session) | `session-queue` | not shown |
| Scope | What a practice session draws from: all decks, one deck, selected topics, or weak cards. | filter, mode | `scope` | scope chooser |
| Grade | The learner's self-assessment of one answer: Not yet, Nearly or Got it. The three values are fixed. | rating, score, answer (as a verb for grading) | `not_yet`, `nearly`, `got_it` in `GRADES` | "Not yet", "Nearly", "Got it" |
| Review | One graded attempt of one card, stored as one `review_log` row. | answer, attempt (alone), response | `reviewLog`, `/reviews` | "review" only for the count in stats |
| Attempt | One showing of a card in a practice session. A re-queued card has more than one attempt in the same session. | try, turn | queue entries | not shown |
| Re-queue | Bringing a card graded Not yet back into the same session after about four other cards, at most twice per session. | retry, repeat, loop | `REQUEUE_GAP` | not shown |
| First attempt | A card's first review on a local day. The only basis of statistics, apart from time per card. | first try, first review | `isFirstAttemptToday` | not shown |
| Lapse | A drop from box 2 or higher back to a lower box after Not yet. | fail, miss (as a noun) | `lapses`, `LAPSE_RULE` | not shown |
| Leech | A card whose lapses reach the threshold. It is flagged for rewording and stays scheduled. | problem card, hard card | `leech` | "leech" |
| New card | A card the profile has never graded. It has no `card_state` row. | unseen card, fresh card | absence of `cardState` | "new" |
| Weak card | An active card in box 1 that has been graded at least once, or any leech. | hard card, struggling card | `weak` scope | "weak" |
| Mastery | The share of a deck's or topic's cards, New included, currently in boxes 4 and 5. A snapshot, not a rate. | progress (for this metric), score | `mastery` | "mastery" |
| Focus next | The three topics with the lowest mastery, among topics with at least three cards. | recommendations, suggestions | `focus` in stats | "Focus next" |
| Day start hour | The hour at which a profile's local day begins (default 07:00). | rollover, cutoff | `dayStartHour`, `dayStartUtc` | not shown |
| Import | Creating or updating a deck from a CSV or a zip (CSV plus images). | upload (for the operation), load | `imports`, `import_runs` | "Import" |
| Re-import | Importing into an existing deck, matched by card id, keeping progress. | sync, update deck | `deckId` on import | "Re-import" |
| Export | Writing a deck out as a zip (CSV plus images). | download, backup | `export` | "Export" |
| Sign-in | The two steps that let someone use the app: passing the access gate (from v0.6, signing in to an account), then selecting a profile. Never called a session. | session, auth session | see the rows below | not shown as one word |
| Access gate | The app-password check in front of the whole app (PRD section 4, AG). Superseded by account sign-in in v0.6; the term goes when the AU feature removes the code. | auth, lock | `AUTH_COOKIE_NAME`, `flipside_auth`, `/login`, `/api/v1/auth` | "Login", "Log out" |
| Account | A household's sign-in, one email and one password, that owns a set of profiles (PRD section 2, AU). Created only by the CLI. | user, household, login, tenant | `accounts`, `accountId` | "email", "password" on the Login page |
| Sign-in token | The random secret a device holds after signing in to an account; the server stores only its hash and can revoke it (AU2). | session, auth session, JWT | `sign_in_tokens`, `flipside_sign_in` | not shown |
| Release | A version tag `vX.Y.Z` on `main`; the only thing that deploys to production (PRD H3). | deploy (as a noun for the version), build | `release` branch, `v*` tags | not shown |
| Installed web app | Flipside added to the Home Screen and opened standalone (PRD W1, W2). | PWA (in UI copy), native app, mobile app | `manifest.ts` | not shown |
| Profile selection | Choosing a profile on the picker. Remembered by a cookie, not a credential. | login, sign in as, switch user | `flipside_profile`, `POST /session/profile` | "Switch profile" |

## Process terms

How agents build the project. Their rules are in `docs/WORKFLOW.md` and `CLAUDE.md`.

| Term | Definition | Avoid | Where |
| --- | --- | --- | --- |
| Feature | A group of requirements delivered by one pull request (F3). | epic, story, ticket | `docs/features.json` |
| Task | One commit-sized step of a feature (F3.5). | subtask, item, issue | `docs/features.json` |
| Ledger | `docs/features.json`: the record of features, tasks, status and PRs. | backlog (for the file), tracker | `docs/features.json` |
| Task gate | `bash scripts/verify.sh` green, then one commit. | pre-commit check | WORKFLOW.md |
| Feature gate | Verify, e2e, axe and one fresh review, before a feature merges. | final check, QA | WORKFLOW.md |
| Milestone review | `/review-milestone`: a review of a group of merged features, run in a fresh session. | retro, audit (an audit is a different thing) | `/review-milestone` |
| Audit | A read-only review through one lens that produces a ledger of findings. | review (for audits) | `docs/audits/` |
| Finding | One reported problem from a review or audit, with a stable id and a severity. | issue, bug (unless it is a defect) | `docs/audits/` |
| ASSUMED | A default a worker took where the PRD was silent, logged for review. | guess, TODO | `docs/decisions.md` |
| ANSWER | The user's decision when a worker was blocked, logged with the task id. | reply, note | `docs/decisions.md` |
| BLOCKED | A worker's report that a stop rule applies and a decision is needed. | stuck, failed | worker report |
| Attempt (process) | One try to fix a failing check: a change followed by a rerun of that check. | try, iteration | stop rule 4 |
| Loop guard | The rule that stops repeating the same failing fix and escalates (stop rule 4). | circuit breaker, retry limit | CLAUDE.md |
| Learned fact | A repo fact (a command, port or environment detail) that cost two failures to discover, recorded so it is not rediscovered. | tip, gotcha, tribal knowledge | `docs/decisions.md` |
| Acceptance criterion (AC) | A testable statement in the PRD of when a requirement is met. Never edited by agents. | test case, done criteria | `docs/PRD.md` |

## Flagged ambiguities

Open naming conflicts. Each one names what to use now and what is not decided. Resolve one by moving its decision into the table above and deleting its entry here.

- **Session.** Used for a practice run, and also in the route `POST /session/profile`. Decided: in prose and new identifiers, "practice session" means only the run, and the sign-in flow is never called a session. Not changed: the route path `/session/profile` is part of the API contract in PRD section 11, so renaming it needs a PRD change first.
- **Add User.** The picker button and AC26 say "User", where everything else says profile. Not changed: the label is copy owned by PRD P8 and AC26. Decision needed: change the copy to "Add profile", or keep "Add User" as deliberate copy for the picker only.
- **Review versus attempt.** A review is one stored graded attempt, but a re-queued attempt is also a `review_log` row (PRD section 7: "re-queued attempts are logged"). So every attempt is a review, and only the first one of a day is a first attempt. Keep both words as defined above.
- **Learner versus Student.** "Student" is the name of one seeded profile role in PRD section 2, not a general term. In prose use "learner" for whoever is practising.
