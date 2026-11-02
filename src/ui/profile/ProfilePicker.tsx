"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/ui/api/client";
import { Avatar } from "@/ui/avatars";
import { Skeleton } from "@/ui/states/Skeleton";
import type { ProfileSummary } from "@/shared/schemas/profile";
import { buttonClass } from "@/ui/button/button-class";

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; profiles: ProfileSummary[] };

export function ProfilePicker() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [pickError, setPickError] = useState(false);

  // The state starts as "loading", so the first fetch sets state only when it settles.
  const fetchProfiles = useCallback(() => {
    api.listProfiles().then(
      (profiles) => setState({ kind: "ready", profiles }),
      () => setState({ kind: "error" }),
    );
  }, []);
  useEffect(fetchProfiles, [fetchProfiles]);
  const retry = () => {
    setState({ kind: "loading" });
    fetchProfiles();
  };

  async function pick(id: string) {
    setPickError(false);
    try {
      await api.selectProfile(id);
      router.push("/library");
    } catch {
      setPickError(true);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-surface p-8">
      <h1 className="text-4xl font-semibold text-on-surface">Who is studying?</h1>
      {state.kind === "loading" && (
        <div role="status" aria-label="Loading" className="flex flex-wrap justify-center gap-8">
          <Skeleton className="h-52 w-44 rounded-3xl" />
          <Skeleton className="h-52 w-44 rounded-3xl" />
        </div>
      )}
      {state.kind === "error" && (
        <div role="alert" className="flex flex-col items-center gap-4 text-center">
          <p className="max-w-md text-on-surface">
            We can&apos;t reach the home server. Your cards and progress are safe. Check that you
            are on the home Wi-Fi, then try again.
          </p>
          <button
            type="button"
            onClick={retry}
            className={buttonClass("primary")}
          >
            Retry
          </button>
        </div>
      )}
      {state.kind === "ready" && (
        <ul className="flex flex-wrap justify-center gap-8">
          {state.profiles.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => pick(p.id)}
                className="flex min-h-11 min-w-44 flex-col items-center gap-4 rounded-3xl bg-surface-container p-6 text-on-surface outline-offset-4 hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Avatar id={p.avatar} />
                <span className="text-xl font-semibold">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {pickError && (
        <p role="alert" className="text-error">
          That did not work. Please try again.
        </p>
      )}
    </main>
  );
}
