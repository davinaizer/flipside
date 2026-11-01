import { expect, test } from "vitest";
import { DEFAULT_SETTINGS, type Settings } from "@/shared/settings";
import { createSettingsSaver } from "./saver";

function deferred() {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

test("saves go out one at a time, in order, each with the latest settings", async () => {
  const sent: number[] = [];
  const gates = [deferred(), deferred()];
  let i = 0;
  const update = createSettingsSaver(
    DEFAULT_SETTINGS,
    (s: Settings) => {
      sent.push(s.newCardsPerDay);
      return gates[i++].promise;
    },
    () => {},
  );
  const a = update({ newCardsPerDay: 1 });
  const b = update({ newCardsPerDay: 15 });
  await Promise.resolve();
  expect(sent).toEqual([15]); // the second has not started: it waits for the first
  gates[0].resolve();
  await a;
  await Promise.resolve();
  expect(sent).toEqual([15, 15]);
  gates[1].resolve();
  await b;
});

test("a failed save rolls back only when no newer change was made", async () => {
  const states: number[] = [];
  const fail = deferred();
  let first = true;
  const update = createSettingsSaver(
    DEFAULT_SETTINGS,
    () => {
      if (first) {
        first = false;
        return fail.promise;
      }
      return Promise.resolve();
    },
    (s) => states.push(s.newCardsPerDay),
  );
  const a = update({ newCardsPerDay: 1 });
  const b = update({ newCardsPerDay: 15 });
  fail.reject(new Error("boom"));
  await expect(a).rejects.toThrow("boom");
  await b;
  expect(states).toEqual([1, 15]); // no rollback to the default over the newer 15

  const lone = createSettingsSaver(DEFAULT_SETTINGS, () => Promise.reject(new Error("x")), (s) => states.push(s.newCardsPerDay));
  states.length = 0;
  await expect(lone({ newCardsPerDay: 7 })).rejects.toThrow("x");
  expect(states).toEqual([7, DEFAULT_SETTINGS.newCardsPerDay]);
});

test("two queued saves that both fail end on the initial settings", async () => {
  const states: number[] = [];
  const update = createSettingsSaver(DEFAULT_SETTINGS, () => Promise.reject(new Error("x")), (s) => states.push(s.newCardsPerDay));
  const a = update({ newCardsPerDay: 1 });
  const b = update({ newCardsPerDay: 15 });
  await expect(a).rejects.toThrow("x");
  await expect(b).rejects.toThrow("x");
  expect(states.at(-1)).toBe(DEFAULT_SETTINGS.newCardsPerDay);
});
