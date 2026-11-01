import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLibrary } from "@/server/decks";
import { PROFILE_COOKIE, profileFromCookie } from "@/server/profile";
import { ImportFlow } from "@/ui/import/ImportFlow";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ deckId?: string | string[] }>;
}) {
  const profile = await profileFromCookie((await cookies()).get(PROFILE_COOKIE)?.value);
  if (!profile) redirect("/");
  const { decks } = await getLibrary(profile.id);
  const { deckId } = await searchParams;
  return (
    <>
      <h1 className="mb-6 text-4xl font-semibold">Add deck</h1>
      <ImportFlow
        decks={decks.map((d) => ({ id: d.id, name: d.name }))}
        initialDeckId={typeof deckId === "string" ? deckId : undefined}
      />
    </>
  );
}
