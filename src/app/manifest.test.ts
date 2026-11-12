import { expect, test } from "vitest";
import { APP_COLOURS } from "@/shared/app-colours";
import manifest from "./manifest";

test("manifest describes an installable standalone app", () => {
  const m = manifest();
  expect(m.name).toBe("Flipside");
  expect(m.short_name).toBeTruthy();
  expect(m.start_url).toBe("/");
  expect(m.display).toBe("standalone");
  expect(m.background_color).toBe(APP_COLOURS.surface);
  expect(m.theme_color).toBe(APP_COLOURS.primary);
  expect(m.icons?.map((i) => [i.src, i.sizes, i.purpose])).toEqual([
    ["/icon/192", "192x192", undefined],
    ["/icon/512", "512x512", undefined],
    ["/icon/maskable", "512x512", "maskable"],
  ]);
});
