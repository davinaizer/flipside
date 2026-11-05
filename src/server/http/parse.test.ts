import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError } from "./errors";
import { parseOrThrow, readJson } from "./parse";

const schema = z.object({ name: z.string().min(1, "Name is required") });

function caught(fn: () => unknown): ApiError {
  try {
    fn();
  } catch (e) {
    return e as ApiError;
  }
  throw new Error("did not throw");
}

describe("parseOrThrow", () => {
  it("returns the parsed data", () => {
    expect(parseOrThrow(schema, { name: "a" }, { status: 400, code: "x" })).toEqual({ name: "a" });
  });

  it("throws with status, code, message and {path, message} details", () => {
    const e = caught(() =>
      parseOrThrow(schema, { name: "" }, { status: 422, code: "bad", message: "Nope" }),
    );
    expect(e).toBeInstanceOf(ApiError);
    expect([e.status, e.code, e.message]).toEqual([422, "bad", "Nope"]);
    expect(e.details).toEqual([{ path: "name", message: "Name is required" }]);
  });

  it("joins the issue messages when no message is given", () => {
    const e = caught(() => parseOrThrow(schema, {}, { status: 400, code: "bad" }));
    expect(e.message).toBe(e.details.map((d) => (d as { message: string }).message).join(". "));
  });
});

const req = (body: string) => new Request("http://x/", { method: "POST", body });

describe("readJson", () => {
  it("parses a JSON body", async () => {
    expect(await readJson(req('{"a":1}'))).toEqual({ a: 1 });
  });

  it("throws 400 invalid_json for bad or empty JSON", async () => {
    for (const body of ["{", ""]) {
      const e = await readJson(req(body)).catch((x: ApiError) => x);
      expect([(e as ApiError).status, (e as ApiError).code]).toEqual([400, "invalid_json"]);
    }
  });

  it("returns null for a blank body with allowEmpty", async () => {
    expect(await readJson(req("  "), { allowEmpty: true })).toBeNull();
  });
});
