import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { RootErrorView } from "./RootErrorView";

test("the root error view shows the theme switch above the error state", () => {
  const html = renderToStaticMarkup(createElement(RootErrorView, { onRetry: () => {} }));
  expect(html).toContain('role="switch"');
  expect(html).toContain("Retry");
  expect(html.indexOf('role="switch"')).toBeLessThan(html.indexOf("Retry"));
});
