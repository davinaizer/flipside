import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { ErrorState } from "./ErrorState";

test("the error state offers Retry and Switch profile, without codes or blame", () => {
  const html = renderToStaticMarkup(createElement(ErrorState, { onRetry: () => {} }));
  expect(html).toContain("Retry");
  expect(html).toContain('href="/?switch=1"');
  expect(html).toContain("Switch profile");
  expect(html).not.toMatch(/\b(500|ECONN|localhost|:\d{4})\b/);
});
