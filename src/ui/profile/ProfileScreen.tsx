"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AVATAR_IDS, type AvatarId } from "@/shared/avatars";
import { profileNameSchema } from "@/shared/schemas/profile";
import { api } from "@/ui/api/client";
import { Avatar } from "@/ui/avatars";
import { buttonClass, FOCUS_RING } from "@/ui/button/button-class";
import { Icon } from "@/ui/icons/Icon";

/** The shared schema's rule and messages; the server stays the authority. */
export function nameError(name: string): string | null {
  const r = profileNameSchema.safeParse(name);
  return r.success ? null : r.error.issues[0].message;
}

type Props = {
  name: string;
  avatar: AvatarId;
  /** Saves the change (PATCH /me). Rejects with an Error whose message is shown. */
  onSave: (v: { name: string; avatar: AvatarId }) => Promise<void>;
  /** When set, a Cancel button is shown (the Add User form on the picker). */
  onCancel?: () => void;
  submitLabel?: string;
  /** Prefix for element ids, so two forms on one page never share an id. */
  idPrefix?: string;
};

export function ProfileForm({
  name: initialName,
  avatar: initialAvatar,
  onSave,
  onCancel,
  submitLabel = "Save",
  idPrefix = "profile",
}: Props) {
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState<AvatarId>(initialAvatar);
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
        <label htmlFor={`${idPrefix}-name`} className="text-headline-sm font-semibold">
          Name
        </label>
        <input
          id={`${idPrefix}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${idPrefix}-name-error` : undefined}
          className={`min-h-11 rounded-xl bg-surface-container-low px-3 outline outline-1 outline-outline ${FOCUS_RING}`}
        />
        {error && (
          <p id={`${idPrefix}-name-error`} role="alert" className="text-error">
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
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonClass("secondary")}>
            Cancel
          </button>
        )}
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

export function ProfileScreen({ name, avatar }: { name: string; avatar: string }) {
  const router = useRouter();
  // The stored avatar is a plain string; fall back to the first if it is not a known id.
  const known = AVATAR_IDS.find((id) => id === avatar) ?? AVATAR_IDS[0];
  async function onSave(v: { name: string; avatar: AvatarId }) {
    await api.updateProfile(v);
    // Re-renders the layout so the sidebar and picker show the change at once.
    router.refresh();
  }
  return (
    <>
      <h1 className="text-headline-lg font-semibold">Profile</h1>
      <p className="text-on-surface-variant">
        Choose your avatar and the name shown around the app.
      </p>
      <ProfileForm name={name} avatar={known} onSave={onSave} />
    </>
  );
}
