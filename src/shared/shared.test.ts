import { describe, expect, it, vi } from "vitest";
import * as c from "./constants";
import { DEFAULT_SETTINGS, settingsSchema } from "./settings";
import { uuidv7 } from "./uuid";

describe("constants", () => {
  it("holds the PRD values", () => {
    expect(c.DEFAULT_DAY_START_HOUR).toBe(7);
    expect(c.BOX_INTERVALS_DAYS).toEqual({ 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 });
    expect(c.LAPSE_RULE).toBe("reset");
    expect(c.LEECH_THRESHOLD).toBe(8);
    expect(c.REQUEUE_GAP).toBe(4);
    expect(c.REQUEUE_MAX_PER_SESSION).toBe(2);
    expect(c.DEFAULT_NEW_CARDS_PER_DAY).toBe(10);
    expect(c.SESSION_LENGTHS).toEqual([5, 10, 20, "all"]);
    expect(c.IMPORT_MAX_ROWS).toBe(2000);
    expect(c.IMPORT_MAX_ZIP_UNCOMPRESSED_BYTES).toBe(200 * 1024 * 1024);
    expect(c.IMAGE_MAX_BYTES).toBe(5 * 1024 * 1024);
    expect(c.IMAGE_MAX_DIMENSION_PX).toBe(4096);
    expect(c.DURATION_CAP_SECONDS).toBe(120);
  });
});

describe("settings", () => {
  it("parses defaults and stores font ids", () => {
    expect(settingsSchema.parse({})).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toMatchObject({
      theme: "light",
      font: "atkinson",
      cardsPerSession: 5,
      newCardsPerDay: 10,
      readAloud: false,
      readingSpeed: "normal",
    });
    expect(settingsSchema.safeParse({ font: "Lexend, sans-serif" }).success).toBe(false);
    expect(settingsSchema.parse({ font: "lexend" }).font).toBe("lexend");
  });
});

describe("uuidv7", () => {
  it("returns v7 ids that sort by time", () => {
    const ids = [1000, 2000, 3_000_000, 1_700_000_000_000].map((t) => uuidv7(t));
    for (const id of ids)
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect([...ids].sort()).toEqual(ids);
  });
  it("encodes the timestamp and uses getRandomValues only", () => {
    const rnd = vi.spyOn(crypto, "randomUUID");
    const id = uuidv7(1_700_000_000_000);
    expect(id.replace("-", "").slice(0, 12)).toBe(
      (1_700_000_000_000).toString(16).padStart(12, "0"),
    );
    expect(rnd).not.toHaveBeenCalled();
    expect(uuidv7()).not.toBe(uuidv7());
  });
});
