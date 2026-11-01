import type { Settings } from "@/shared/settings";

/**
 * Saves settings one request at a time, in the order the changes were made, so a slow earlier
 * PUT can never land after a later one. Each request sends the newest settings at the moment it
 * runs (PUT replaces the whole object). On failure the change is rolled back only if nothing newer
 * was changed since; otherwise the newer change owns the state and its own save follows.
 */
export function createSettingsSaver(
  initial: Settings,
  save: (s: Settings) => Promise<unknown>,
  onChange: (s: Settings) => void,
) {
  let current = initial;
  let version = 0;
  let chain: Promise<unknown> = Promise.resolve();

  return function update(patch: Partial<Settings>): Promise<void> {
    const previous = current;
    const mine = ++version;
    current = { ...current, ...patch };
    onChange(current);
    const run = chain.then(() => save(current));
    chain = run.catch(() => undefined); // a failed save must not stall later ones
    return run.then(
      () => undefined,
      (e) => {
        if (version === mine) {
          current = previous;
          onChange(previous);
        }
        throw e;
      },
    );
  };
}
