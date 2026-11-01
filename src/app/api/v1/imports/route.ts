import { ApiError, toErrorResponse } from "@/server/http/errors";
import { previewImport, readUpload } from "@/server/imports";
import { getCurrentProfile } from "@/server/profile";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    await getCurrentProfile(request);
    const dryRun = new URL(request.url).searchParams.get("dryRun") === "true";
    // The saving import arrives in F3.4; until then only the dry run exists.
    if (!dryRun) throw new ApiError(501, "not_implemented", "Saving an import is not available yet.");
    return Response.json(await previewImport(await readUpload(request)));
  } catch (e) {
    return toErrorResponse(e);
  }
}
