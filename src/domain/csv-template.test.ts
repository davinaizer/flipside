import { expect, test } from "vitest";
import { parseCsv } from "./csv-import";
import { CSV_TEMPLATE } from "./csv-template";

test("the template parses with no errors or warnings", () => {
  const r = parseCsv(CSV_TEMPLATE);
  expect(r.issues).toEqual([]);
  expect(r.cards).toHaveLength(2);
});
