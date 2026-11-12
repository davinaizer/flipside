import { expect, it, vi } from "vitest";

const sentinel = { sentinel: true };
vi.mock("@/server/images/vercel-blob-driver", () => ({
  createVercelBlobImageStore: () => sentinel,
}));

it("getImageStore returns the vercel-blob driver when IMAGE_STORE_DRIVER=vercel-blob", async () => {
  process.env.IMAGE_STORE_DRIVER = "vercel-blob";
  process.env.DATABASE_URL ??= "postgres://x";
  const { getImageStore } = await import("@/server/images/store");
  expect(getImageStore()).toBe(sentinel);
});
