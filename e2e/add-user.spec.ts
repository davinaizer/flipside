import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect } from "@playwright/test";
import postgres from "postgres";
import { expectNoSeriousA11y, setTheme, test } from "./helpers";

// F19.3 (P8). No API deletes a profile, so the test removes its own row straight from the e2e database
// (the URL file is written by scripts/e2e-server.mjs). A new profile owns no other rows until it is used for
// something, and this test only selects it, so a plain delete is enough. Each project uses its own name.
const appPort = Number(process.env.E2E_PORT ?? "3100");
async function removeProfile(name: string) {
  const sql = postgres(readFileSync(join(tmpdir(), `flipside-e2e-${appPort}.dburl`), "utf8"));
  try {
    await sql`delete from profiles where name = ${name}`;
  } finally {
    await sql.end();
  }
}

test("Add User: open, cancel, reject bad names, create, pick, land on an empty Library", async ({
  page,
}, info) => {
  const name = `Added ${info.project.name}`;
  await removeProfile(name);
  try {
    await page.goto("/?switch=1");
    await expect(page.getByRole("button", { name: "Davi" })).toBeVisible();
    const open = page.getByRole("button", { name: "Add User" });
    const form = page.getByRole("region", { name: "Add User" });

    // Open and cancel: the form goes away and nothing is created.
    await open.click();
    await expect(form).toBeVisible();
    await form.getByRole("button", { name: "Cancel" }).click();
    await expect(form).toHaveCount(0);
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);

    // Axe with the form open, in both themes.
    await open.click();
    for (const theme of ["light", "dark"] as const) {
      await setTheme(page, theme);
      await expectNoSeriousA11y(page);
    }

    // Invalid names are rejected and nothing is created.
    const field = form.getByLabel("Name");
    await form.getByRole("button", { name: "Add", exact: true }).click();
    await expect(form.getByRole("alert")).toHaveText("Name cannot be empty");
    await field.fill("x".repeat(25));
    await form.getByRole("button", { name: "Add", exact: true }).click();
    await expect(form.getByRole("alert")).toHaveText(/24 characters or fewer/);
    const before = await (await page.request.get("/api/v1/profiles")).json();
    expect(JSON.stringify(before)).not.toContain("xxxxxxxxxxxxxxxxxxxxxxxxx");

    // Create: it joins the picker and the form closes.
    await field.fill(name);
    await form.getByRole("button", { name: "Add", exact: true }).click();
    await expect(form).toHaveCount(0);
    const created = page.getByRole("button", { name, exact: true });
    await expect(created).toBeVisible();

    // Select it: an empty Library.
    await created.click();
    await page.waitForURL("**/library");
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Science|History/ })).toHaveCount(0);
    const lib = await (await page.request.get("/api/v1/library")).json();
    expect(lib.groups).toEqual([]);
  } finally {
    await removeProfile(name);
  }
});

test("POST /profiles without the sign-in cookie answers 401", async ({ playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL });
  const res = await anon.post("/api/v1/profiles", { data: { name: "Nope", avatar: "x" } });
  expect(res.status()).toBe(401);
  await anon.dispose();
});
