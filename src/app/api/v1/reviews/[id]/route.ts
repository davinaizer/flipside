import { handle } from "@/server/http/handle";
import { readJson } from "@/server/http/parse";
import { putReview, undoReview } from "@/server/reviews";

export const dynamic = "force-dynamic";

type Params = { id: string };

/** Records a grade from {sessionId, cardId, grade, durationMs}; a retry with the same id returns the original. */
export const PUT = handle<Params>(async ({ request, profile, params }) => {
  const body = await readJson(request);
  return Response.json(await putReview(profile, params.id, body));
});

/** Undo: restores the card's previous state and marks the review undone; a repeat returns the same result. */
export const DELETE = handle<Params>(async ({ profile, params }) =>
  Response.json(await undoReview(profile, params.id)),
);
