import { zipSync, strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { parseImportFile } from "./import-file";

const csv = "id,topic,front,back,front_image\na,T,Q1,A1,x.png\nb,T,Q2,A2,x.png\nc,T,Q3,A3,\n";

describe("image warnings", () => {
  it("warns per referencing row for a CSV-only upload", async () => {
    const r = await parseImportFile(strToU8(csv));
    if (!r.ok) throw new Error("blocked");
    const w = r.issues.filter((i) => i.code === "missing_image");
    expect(w.map((i) => i.row)).toEqual([2, 3]);
    expect(w.every((i) => i.severity === "warning" && i.image === "x.png")).toBe(true);
  });

  it("gives zip image warnings the row of each referencing CSV row", async () => {
    const r = await parseImportFile(zipSync({ "deck.csv": strToU8(csv) }));
    if (!r.ok) throw new Error("blocked");
    expect(r.issues.filter((i) => i.code === "missing_image").map((i) => i.row)).toEqual([2, 3]);
  });
});
