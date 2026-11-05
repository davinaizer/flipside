import { describe, expect, it } from "vitest";
import { IMPORT_MAX_ROWS } from "../shared/constants";
import { bulletLines, deriveCardId, parseCsv, type CsvIssue } from "./csv-import";

const files = import.meta.glob("../../fixtures/csv/*.csv", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const load = (name: string) => files[`../../fixtures/csv/${name}.csv`];

interface Expected {
  file: string;
  severity: CsvIssue["severity"];
  code: CsvIssue["code"];
  row?: number;
  blocked: boolean;
  cards: number;
}

const broken: Expected[] = [
  { file: "empty-file", severity: "block", code: "empty_file", blocked: true, cards: 0 },
  {
    file: "missing-topic-column",
    severity: "block",
    code: "missing_column",
    blocked: true,
    cards: 0,
  },
  {
    file: "missing-front-column",
    severity: "block",
    code: "missing_column",
    blocked: true,
    cards: 0,
  },
  {
    file: "missing-back-column",
    severity: "block",
    code: "missing_column",
    blocked: true,
    cards: 0,
  },
  { file: "empty-topic", severity: "error", code: "empty_field", row: 3, blocked: false, cards: 1 },
  { file: "empty-front", severity: "error", code: "empty_field", row: 3, blocked: false, cards: 1 },
  { file: "empty-back", severity: "error", code: "empty_field", row: 3, blocked: false, cards: 1 },
  {
    file: "duplicate-id",
    severity: "error",
    code: "duplicate_id",
    row: 3,
    blocked: false,
    cards: 1,
  },
  { file: "unknown-column", severity: "warning", code: "unknown_column", blocked: false, cards: 1 },
  {
    file: "missing-id-column",
    severity: "warning",
    code: "missing_id_column",
    blocked: false,
    cards: 1,
  },
  {
    file: "empty-id-cell",
    severity: "warning",
    code: "missing_id",
    row: 3,
    blocked: false,
    cards: 2,
  },
];

describe("CSV validation, one broken file per rule", () => {
  it.each(broken)("$file", (c) => {
    const r = parseCsv(load(c.file));
    const hit = r.issues.find((i) => i.code === c.code);
    expect(hit?.severity).toBe(c.severity);
    expect(hit?.row).toBe(c.row);
    expect(r.blocked).toBe(c.blocked);
    expect(r.cards).toHaveLength(c.cards);
  });
});

describe("parseCsv behaviour", () => {
  it("accepts free column order", () => {
    const r = parseCsv(load("column-order"));
    expect(r.cards[0]).toMatchObject({ id: "a", topic: "T", front: "Q", back: "A" });
  });

  it("trims cells and preserves unicode", () => {
    const [card] = parseCsv(load("trimmed-unicode")).cards;
    expect(card.id).toBe("a");
    expect(card.topic).toBe("7F Chemistry");
    expect(card.front).toBe("CO₂ makes limewater cloudy → milky");
  });

  it("names the unknown column and keeps the rest", () => {
    const r = parseCsv(load("unknown-column"));
    expect(r.unknownColumns).toEqual(["colour"]);
    expect(r.columns).toEqual(["id", "topic", "front", "back"]);
  });

  it("skips the later duplicate and keeps the first", () => {
    const r = parseCsv(load("duplicate-id"));
    expect(r.cards[0].front).toBe("Q");
  });

  it("derives a stable id and flags it", () => {
    const a = parseCsv(load("missing-id-column")).cards[0];
    const b = parseCsv(load("missing-id-column")).cards[0];
    expect(a.idDerived).toBe(true);
    expect(a.id).toBe(b.id);
    expect(a.id).toBe(deriveCardId(" t ", "Q"));
    expect(deriveCardId("T", "Q2")).not.toBe(a.id);
  });

  it("keeps multi-line cells and image columns", () => {
    const r = parseCsv('id,topic,front,back,front_image\na,T,Q,"one\ntwo",pic.png\n');
    expect(r.cards[0]).toMatchObject({ back: "one\ntwo", frontImage: "pic.png", backImage: null });
  });

  it("does not interpret HTML", () => {
    expect(parseCsv("topic,front,back\nT,<b>x</b>,A\n").cards[0].front).toBe("<b>x</b>");
  });

  const rows = (n: number) =>
    "id,topic,front,back\n" + Array.from({ length: n }, (_, i) => `c${i},T,Q${i},A`).join("\n");

  it("allows 2,000 rows and blocks 2,001", () => {
    expect(parseCsv(rows(IMPORT_MAX_ROWS)).blocked).toBe(false);
    const over = parseCsv(rows(IMPORT_MAX_ROWS + 1));
    expect(over.blocked).toBe(true);
    expect(over.issues[0].code).toBe("too_many_rows");
  });

  it("handles a BOM and CRLF", () => {
    const r = parseCsv("﻿id,topic,front,back\r\na,T,Q,A\r\n");
    expect(r.cards).toHaveLength(1);
  });
});

describe("bulletLines", () => {
  it("lists two or more non-empty lines for bullets", () => {
    expect(bulletLines("one\n\n two \nthree", "bullets")).toEqual(["one", "two", "three"]);
  });
  it("returns null for one line, or blank extras", () => {
    expect(bulletLines("only\n\n", "bullets")).toBeNull();
  });
  it("returns null for paragraph style", () => {
    expect(bulletLines("a\nb", "paragraph")).toBeNull();
  });
});
