"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiClientError } from "@/ui/api/client";
import { Logo } from "@/ui/icons/Icon";
import { AttributeThemeSwitch } from "@/ui/settings/AttributeThemeSwitch";
import { buttonClass } from "@/ui/button/button-class";
import { APP_VERSION } from "@/shared/version";

const NEUTRAL_ERROR = "That email and password did not work. Please try again.";

/** Presentational form: the same layout as the picker, email and password fields, one neutral error (AU1). */
export function LoginForm({
  onSubmit,
  error,
  busy = false,
}: {
  onSubmit: (email: string, password: string) => void;
  error: string | null;
  busy?: boolean;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-10 bg-surface safe-area safe-t safe-r safe-b safe-l [--edge:2rem]">
      <div className="absolute right-[calc(2rem+env(safe-area-inset-right))] top-[calc(1rem+env(safe-area-inset-top))]">
        <AttributeThemeSwitch />
      </div>
      <div className="flex items-center gap-3 rounded-full border border-card-edge bg-surface-card py-2 pl-2 pr-5 shadow-card">
        <Logo size={36} />
        <span className="font-semibold text-headline-sm">Flipside</span>
      </div>
      <h1 className="text-display-mobile font-bold text-on-surface">Sign in</h1>
      <form
        className="flex w-full max-w-sm flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          onSubmit(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
        }}
      >
        <label className="flex flex-col gap-2 text-on-surface">
          <span className="font-semibold">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            className="min-h-11 rounded-xl border border-card-edge bg-surface-card px-4 text-on-surface"
          />
        </label>
        <label className="flex flex-col gap-2 text-on-surface">
          <span className="font-semibold">Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="min-h-11 rounded-xl border border-card-edge bg-surface-card px-4 text-on-surface"
          />
        </label>
        {error && (
          <p role="alert" className="text-error">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={buttonClass("primary")}>
          Sign in
        </button>
      </form>
      <p className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] text-sm text-on-surface-variant">
        {APP_VERSION}
      </p>
    </main>
  );
}

export function LoginScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(email: string, password: string) {
    setBusy(true);
    setError(null);
    try {
      await api.login(email, password);
      router.push("/");
    } catch (e) {
      setError(
        e instanceof ApiClientError && e.status === 401
          ? NEUTRAL_ERROR
          : "Something went wrong. Please try again.",
      );
      setBusy(false);
    }
  }

  return <LoginForm onSubmit={submit} error={error} busy={busy} />;
}
