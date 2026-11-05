import { deleteDeck, getDeck, updateDeck } from "@/server/decks";
import { handle } from "@/server/http/handle";
import { readJson } from "@/server/http/parse";

export const dynamic = "force-dynamic";

type Params = { id: string };

export const GET = handle<Params>(async ({ profile, params }) =>
  Response.json(await getDeck(profile, params.id)),
);

export const PATCH = handle<Params>(async ({ request, profile, params }) => {
  const body = await readJson(request);
  return Response.json(await updateDeck(profile.id, params.id, body));
});

export const DELETE = handle<Params>(async ({ profile, params }) => {
  await deleteDeck(profile.id, params.id);
  return new Response(null, { status: 204 });
});
