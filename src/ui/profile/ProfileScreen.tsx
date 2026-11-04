"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AVATAR_IDS, type AvatarId } from "@/shared/avatars";
import { PROFILE_NAME_MAX } from "@/shared/constants";
import { api } from "@/ui/api/client";
import { Avatar } from "@/ui/avatars";
import { buttonClass, FOCUS_RING } from "@/ui/button/button-class";
import { Icon } from "@/ui/icons/Icon";

/** Same rule as the server schema (trimmed, 1 to 24); the server stays the authority. */
export function nameError(name: string): string | null {
  const n = name.trim();
  if (n.length === 0) return "Name cannot be empty";
  if (n.length > PROFILE_NAME_MAX) return `Name must be ${PROFILE_NAME_MAX} characters or fewer`;
  return null;
}

type Props = {
  name: string;
  avatar: string;
  /** Saves the change (PATCH /me). Rejects with an Error whose message is shown. */
  onSave: (v: { name: string; avatar: string }) => Promise<void>;
};

export function ProfileForm({ name: initialName, avatar: initialAvatar, onSave }: Props) {
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const error = touched ? nameError(name) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (nameError(name)) return;
    setStatus("saving");
    try {
      await onSave({ name: name.trim(), avatar });
      setName(name.trim());
      setStatus("saved");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "That did not save. Please try again.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 flex max-w-full flex-col gap-8">
      <div className="flex flex-col gap-2 max-w-xs">
        <label htmlFor="profile-name" className="text-headline-sm font-semibold">
          Name
        </label>
        <input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "profile-name-error" : undefined}
          className={`min-h-11 rounded-xl bg-surface-container-low px-3 outline outline-1 outline-outline ${FOCUS_RING}`}
        />
        {error && (
          <p id="profile-name-error" role="alert" className="text-error">
            {error}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="mb-3 text-headline-sm font-semibold">Avatar</legend>
        <div className="flex flex-wrap gap-4">
          {AVATAR_IDS.map((id, i) => (
            <label key={id} className="relative cursor-pointer">
              <input
                type="radio"
                name="avatar"
                value={id}
                checked={avatar === id}
                onChange={() => setAvatar(id)}
                aria-label={`Avatar ${i + 1}`}
                className="peer sr-only"
              />
              <span
                className={`flex min-h-11 min-w-11 rounded-full p-1 outline outline-2 outline-transparent peer-checked:outline-primary peer-active:scale-[0.98] motion-reduce:peer-active:scale-100 peer-focus-visible:outline-primary peer-focus-visible:outline-offset-2 hover:bg-surface-container-low`}
              >
                <Avatar id={id} size={128} />
              </span>
              {/* Selected is shown by a tick as well as the ring, so it is not colour alone. */}
              {avatar === id && (
                <span
                  data-selected
                  className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary"
                >
                  <Icon name="check" size={16} />
                </span>
              )}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={status === "saving"} className={buttonClass("primary")}>
          Save
        </button>
        {status === "saved" && (
          <p role="status" className="text-on-surface-variant">
            Saved
          </p>
        )}
        {status === "error" && (
          <p role="alert" className="text-error">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}

/** Clears the auth cookie (POST /auth/logout), then goes to the login page (AG3). */
export async function signOut(push: (href: string) => void): Promise<void> {
  await api.logout();
  push("/login");
}

export function ProfileScreen({ name, avatar }: { name: string; avatar: string }) {
  const router = useRouter();
  async function onSave(v: { name: string; avatar: string }) {
    await api.updateProfile({ name: v.name, avatar: v.avatar as AvatarId });
    // Re-renders the layout so the top bar, sidebar and picker show the change at once.
    router.refresh();
  }
  return (
    <>
      <h1 className="text-headline-lg font-semibold">Profile</h1>
      <p className="text-on-surface-variant">Choose your avatar and the name shown around the app.</p>
      <ProfileForm name={name} avatar={avatar} onSave={onSave} />
      <button type="button" onClick={() => signOut(router.push)} className={`mt-8 ${buttonClass("secondary")}`}>
        Sign out
      </button>
    </>
  );
}
