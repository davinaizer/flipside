import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLibrary } from "@/server/decks";
import { PROFILE_COOKIE, profileFromCookie } from "@/server/profile";

export default async function LibraryPage() {
  const profile = await profileFromCookie((await cookies()).get(PROFILE_COOKIE)?.value);
  if (!profile) redirect("/"); // pages render alongside the layout, so guard here too
  const { decks } = await getLibrary(profile.id);
  return (
    <>
      <h1 className="mb-6 text-4xl font-semibold">Library</h1>
      {decks.length === 0 ? (
        <p className="text-on-surface-variant">No decks yet.</p>
      ) : (
        <ul className="flex max-w-2xl flex-col gap-3">
          {decks.map((d) => (
            <li key={d.id}>
              <Link
                href={`/decks/${d.id}`}
                className="flex min-h-11 items-center rounded-2xl bg-surface-container p-4 text-lg font-semibold hover:bg-surface-container-high"
              >
                {d.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
