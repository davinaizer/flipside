# Glossary

Domain terms used in code, reviews and architecture discussions. The PRD stays authoritative; this file pins down names that the code relies on.

## Practice

**Session**: one practice run over a fixed, ordered list of card ids chosen when it starts (`sessions.meta.cardIds`). Starting it again with the same id returns the same list.

**Session queue**: the attempts a session plays, in order. It starts as one attempt per card and grows when a card is re-queued. It is never stored: it is rebuilt by **replay**. Lives in `src/domain/session-queue.ts`, shared by server and client.

**Replay**: rebuilding the session queue from the session's live card ids and its live grades, in the order they were given. Server and client replay the same inputs, so they agree on the queue. Undone grades are not live; neither are cards (or decks) deleted since the session started.

**Attempt**: one entry in the session queue. Attempt 1 is the card's first showing; 2 and 3 are re-queued attempts.

**Current card**: the card of the queue entry at the current position. The server accepts a grade only for the current card.

**Re-queue**: a Not yet adds another attempt for the card after `REQUEUE_GAP` other cards, at most `REQUEUE_MAX_PER_SESSION` times per card per session (PRD section 5). The session queue alone decides it; the scheduler does not.

**New card**: a card the profile has never graded; it has no `card_state` row (scheduler state `null`).

**Due card**: a graded, non-suspended card whose due date is on or before the learning day. Defined once in the session builder.

**Candidates**: the cards a session over a scope could hold before the length cut: due cards plus New cards up to what the daily new-card cap still allows (PRD section 5). Library and Deck page counts are candidate counts from the session builder, so they always equal what a session would pick.

**Finished (session)**: the replayed queue has no current card. A finished session is marked `completed`; one the learner leaves first is `ended_early` (R7).
