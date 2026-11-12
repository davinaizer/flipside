import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { APP_COLOURS } from "./app-colours";

test("APP_COLOURS equals the light theme tokens", () => {
  const css = readFileSync(join(__dirname, "../ui/tokens.css"), "utf8");
  const light = css.slice(css.indexOf(":root"), css.indexOf('[data-theme="dark"] {'));
  const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6});`).exec(light)?.[1];
  expect(token("primary")).toBe(APP_COLOURS.primary);
  expect(token("on-primary")).toBe(APP_COLOURS.onPrimary);
});
