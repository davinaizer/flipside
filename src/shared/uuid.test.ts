import { describe, expect, it } from "vitest";
import { isUuid, uuidv7 } from "./uuid";

describe("isUuid", () => {
  it("accepts a generated v7 id, any case", () => {
    const id = uuidv7();
    expect(isUuid(id)).toBe(true);
    expect(isUuid(id.toUpperCase())).toBe(true);
  });

  it("accepts ids with a zero version nibble, which Zod's uuid() rejects", () => {
    expect(isUuid("00000000-0000-0000-0000-000000000001")).toBe(true);
  });

  it.each([
    "",
    "not-a-uuid",
    "0000000000000000000000000000000a",
    "00000000-0000-0000-0000-00000000000g",
  ])("rejects %j", (value) => {
    expect(isUuid(value)).toBe(false);
  });
});
