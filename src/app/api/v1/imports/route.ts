import { handle } from "@/server/http/handle";
import { commitImport, previewImport, readUpload } from "@/server/imports";

export const dynamic = "force-dynamic";

export const POST = handle(async ({ request, profile }) => {
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "true";
  const upload = await readUpload(request);
  if (dryRun) return Response.json(await previewImport(upload.bytes));
  return Response.json(await commitImport(profile.id, upload), { status: 201 });
});
