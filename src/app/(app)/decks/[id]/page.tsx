import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { settingsSchema } from "@/shared/settings";
import { DeckScreen } from "@/ui/deck/DeckScreen";
import { getDeck, getLeeches } from "@/server/decks";
import { ApiError } from "@/server/http/errors";
import { profileFromCookies } from "@/server/profile";

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await profileFromCookies(await cookies());
  if (!profile) redirect("/");
  const id = (await params).id;
  const [{ deck }, { leeches }] = await Promise.all([
    getDeck(profile, id),
    getLeeches(profile.id, id),
  ]).catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  return (
    <DeckScreen
      deck={deck}
      leeches={leeches}
      sessionLength={settingsSchema.parse(profile.settings).cardsPerSession}
    />
  );
}
