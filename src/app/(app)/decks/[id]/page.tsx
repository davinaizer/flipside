import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { settingsSchema } from "@/shared/settings";
import { DeckScreen } from "@/ui/deck/DeckScreen";
import { getDeck } from "@/server/decks";
import { ApiError } from "@/server/http/errors";
import { PROFILE_COOKIE, profileFromCookie } from "@/server/profile";

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await profileFromCookie((await cookies()).get(PROFILE_COOKIE)?.value);
  if (!profile) redirect("/");
  const { deck } = await getDeck(profile, (await params).id).catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  return (
    <DeckScreen
      deck={deck}
      sessionLength={settingsSchema.parse(profile.settings).cardsPerSession}
    />
  );
}
