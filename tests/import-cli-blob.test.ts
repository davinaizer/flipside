import { expect, it, vi } from "vitest";

const put = vi.fn(async () => ({}));
vi.mock("@vercel/blob", () => ({
  BlobNotFoundError: class BlobNotFoundError extends Error {},
  head: vi.fn(async () => {
    const { BlobNotFoundError } = await import("@vercel/blob");
    throw new BlobNotFoundError();
  }),
  put,
  get: vi.fn(),
  del: vi.fn(),
}));

// The CLI saves images through getImageStore, so IMAGE_STORE_DRIVER picks the driver for it too.
// The SDK reads BLOB_READ_WRITE_TOKEN from the environment itself; nothing is passed in code.
it("the image store the CLI uses follows IMAGE_STORE_DRIVER=vercel-blob and the SDK token", async () => {
  process.env.IMAGE_STORE_DRIVER = "vercel-blob";
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";
  process.env.DATABASE_URL ??= "postgres://x";
  const { getImageStore } = await import("@/server/images/store");
  await getImageStore().put("a/b.png", new Uint8Array([1, 2]), "image/png");
  expect(put).toHaveBeenCalledWith(
    "a/b.png",
    expect.any(Buffer),
    expect.objectContaining({ access: "private", contentType: "image/png" }),
  );
  expect(process.env.BLOB_READ_WRITE_TOKEN).toBe("test-token");
});
