import { deleteDeck, getDeck, updateDeck } from "@/server/decks";
import { toErrorResponse } from "@/server/http/errors";
import { readJson } from "@/server/http/parse";
import { getCurrentProfile } from "@/server/profile";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx): Promise<Response> {
  try {
    const profile = await getCurrentProfile(request);
    return Response.json(await getDeck(profile, (await params).id));
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  try {
    const profile = await getCurrentProfile(request);
    const body = await readJson(request);
    return Response.json(await updateDeck(profile.id, (await params).id, body));
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function DELETE(request: Request, { params }: Ctx): Promise<Response> {
  try {
    const profile = await getCurrentProfile(request);
    await deleteDeck(profile.id, (await params).id);
    return new Response(null, { status: 204 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
