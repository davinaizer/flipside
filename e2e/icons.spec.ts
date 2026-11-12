import { expect, test } from "@playwright/test";

// No sign-in: the browser and iOS fetch icons without the cookie.
const ICONS = [
  { url: "/icon/192", size: 192 },
  { url: "/icon/512", size: 512 },
  { url: "/icon/maskable", size: 512 },
  { url: "/apple-icon", size: 180 },
];

for (const { url, size } of ICONS) {
  test(`${url} is a ${size} px PNG`, async ({ request }) => {
    const res = await request.get(url);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
    const png = await res.body();
    // PNG IHDR: width at byte 16, height at byte 20 (big endian).
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
  });
}
