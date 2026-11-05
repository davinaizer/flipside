import { expect, test } from "vitest";
import {
  readCollapsed,
  subscribeCollapsed,
  SIDEBAR_STORAGE_KEY,
  writeCollapsed,
} from "./sidebar-state";

function fakeStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    m,
  };
}

test("defaults to expanded and round-trips the collapsed state", () => {
  const s = fakeStore();
  expect(readCollapsed(s)).toBe(false);
  writeCollapsed(true, s);
  expect(s.m.get(SIDEBAR_STORAGE_KEY)).toBe("1");
  expect(readCollapsed(s)).toBe(true);
  writeCollapsed(false, s);
  expect(readCollapsed(s)).toBe(false);
});

test("tolerates storage being unavailable or throwing", () => {
  const broken = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  expect(readCollapsed(broken)).toBe(false);
  expect(readCollapsed(null)).toBe(false);
  expect(() => writeCollapsed(true, broken)).not.toThrow();
  // Node has no localStorage: the default storage resolves to none, and the toggle still works in memory.
  let calls = 0;
  const off = subscribeCollapsed(() => calls++);
  expect(() => writeCollapsed(true)).not.toThrow();
  expect(readCollapsed()).toBe(true);
  expect(calls).toBe(1);
  off();
  writeCollapsed(false);
  expect(calls).toBe(1);
});
