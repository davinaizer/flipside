import { toErrorResponse } from "@/server/http/errors";
import { getImage } from "@/server/images/service";
import { getCurrentProfile } from "@/server/profile";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const profile = await getCurrentProfile(request);
    const image = await getImage(
      profile.id,
      (await params).id,
      request.headers.get("if-none-match"),
    );
    const headers = {
      "Content-Type": image.mime,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=31536000, immutable",
      ETag: image.etag,
    };
    return new Response(image.stream, { status: image.stream ? 200 : 304, headers });
  } catch (e) {
    return toErrorResponse(e);
  }
}
