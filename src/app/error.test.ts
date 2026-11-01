import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import RootError from "./error";

test("root error boundary renders Retry and Switch profile", () => {
  const html = renderToStaticMarkup(
    createElement(RootError, { error: new Error("db down"), reset: () => {} }),
  );
  expect(html).toContain("Retry");
  expect(html).toContain("Switch profile");
  expect(html).not.toContain("db down");
});
