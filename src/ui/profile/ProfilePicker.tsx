"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/ui/api/client";
import { Logo } from "@/ui/icons/Icon";
import { Avatar } from "@/ui/avatars";
import { AttributeThemeSwitch } from "@/ui/settings/AttributeThemeSwitch";
import { Skeleton } from "@/ui/states/Skeleton";
import type { ProfileSummary } from "@/shared/schemas/profile";
import { buttonClass, TAPPABLE_CARD } from "@/ui/button/button-class";

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
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-10 bg-surface p-8">
      <div className="absolute right-8 top-4">
        <AttributeThemeSwitch />
      </div>
      <div className="flex items-center gap-3 rounded-full border border-card-edge bg-surface-card py-2 pl-2 pr-5 shadow-card">
        <Logo size={36} />
        <span className="font-semibold text-headline-sm">Flipside</span>
      </div>
      <h1 className="text-display-mobile font-bold text-on-surface">Who is studying?</h1>
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
                className={`flex min-h-11 min-w-52 flex-col items-center gap-4 overflow-hidden rounded-card border-t-4 border-t-primary-container border-x border-b border-x-card-edge border-b-card-edge bg-surface-card px-8 pb-8 pt-8 text-on-surface shadow-card outline-offset-4 ${TAPPABLE_CARD}`}
              >
                <Avatar id={p.avatar} size={112} />
                <span className="text-headline-md font-semibold">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="rounded-full border border-card-edge bg-surface-card px-5 py-2 text-body-sm text-on-surface-variant">
        Each profile keeps its own cards, progress and reading settings.
      </p>
      {pickError && (
        <p role="alert" className="text-error">
          That did not work. Please try again.
        </p>
      )}
    </main>
  );
}
