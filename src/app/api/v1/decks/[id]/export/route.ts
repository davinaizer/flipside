import { exportDeck } from "@/server/export";
import { handle } from "@/server/http/handle";

export const dynamic = "force-dynamic";

export const GET = handle<{ id: string }>(async ({ profile, params }) => {
  const { filename, bytes } = await exportDeck(profile.id, params.id);
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
