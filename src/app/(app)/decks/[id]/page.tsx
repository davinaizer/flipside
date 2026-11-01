import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getDeck } from "@/server/decks";
import { ApiError } from "@/server/http/errors";
import { PROFILE_COOKIE, profileFromCookie } from "@/server/profile";

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await profileFromCookie((await cookies()).get(PROFILE_COOKIE)?.value);
  if (!profile) redirect("/");
  const { deck } = await getDeck(profile.id, (await params).id).catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  return <h1 className="text-4xl font-semibold">{deck.name}</h1>;
}
