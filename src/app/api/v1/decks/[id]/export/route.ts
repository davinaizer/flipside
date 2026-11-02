import { toErrorResponse } from "@/server/http/errors";
import { exportDeck } from "@/server/export";
import { getCurrentProfile } from "@/server/profile";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const profile = await getCurrentProfile(request);
    const { filename, bytes } = await exportDeck(profile.id, (await params).id);
    return new Response(bytes as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}
