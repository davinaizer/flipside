import { handle } from "@/server/http/handle";
import { getImage } from "@/server/images/service";

export const dynamic = "force-dynamic";

export const GET = handle<{ id: string }>(async ({ request, profile, params }) => {
  const image = await getImage(profile.id, params.id, request.headers.get("if-none-match"));
  const headers = {
    "Content-Type": image.mime,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=31536000, immutable",
    ETag: image.etag,
  };
  return new Response(image.stream, { status: image.stream ? 200 : 304, headers });
});
