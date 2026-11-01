import type { Settings } from "@/shared/settings";

/**
 * Saves settings one request at a time, in the order the changes were made, so a slow earlier
 * PUT can never land after a later one. Each request sends the newest settings at the moment it
 * runs (PUT replaces the whole object). On failure the change is rolled back to the last confirmed
 * settings, and only if nothing newer was changed since; otherwise the newer change owns the state.
 */
export function createSettingsSaver(
  initial: Settings,
  save: (s: Settings) => Promise<unknown>,
  onChange: (s: Settings) => void,
) {
  let current = initial;
  let confirmed = initial; // last settings the server accepted
  let version = 0;
  let chain: Promise<unknown> = Promise.resolve();

  return function update(patch: Partial<Settings>): Promise<void> {
    const mine = ++version;
    current = { ...current, ...patch };
    onChange(current);
    const run = chain.then(async () => {
      const sent = current;
      await save(sent);
      confirmed = sent;
    });
    chain = run.catch(() => undefined); // a failed save must not stall later ones
    return run.then(
      () => undefined,
      (e) => {
        if (version === mine) {
          current = confirmed;
          onChange(confirmed);
        }
        throw e;
      },
    );
  };
}
