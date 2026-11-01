import { toErrorResponse } from "@/server/http/errors";
import { commitImport, previewImport, readUpload } from "@/server/imports";
import { getCurrentProfile } from "@/server/profile";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const profile = await getCurrentProfile(request);
    const dryRun = new URL(request.url).searchParams.get("dryRun") === "true";
    const upload = await readUpload(request);
    if (dryRun) return Response.json(await previewImport(upload.bytes));
    return Response.json(await commitImport(profile.id, upload), { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
