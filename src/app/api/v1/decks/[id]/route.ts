import { deleteDeck, getDeck, updateDeck } from "@/server/decks";
import { errorResponse, toErrorResponse } from "@/server/http/errors";
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
    const body: unknown = await request.json().catch(() => undefined);
    if (body === undefined) return errorResponse(400, "invalid_json", "The body must be JSON.");
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
