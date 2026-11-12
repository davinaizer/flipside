import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { APP_COLOURS } from "@/shared/app-colours";

/**
 * PLACEHOLDER artwork (see docs/decisions.md): the letter F in Lexend on the primary
 * colour. `letterRatio` is the letter's height as a share of the icon; the maskable
 * icon keeps it small so the letter stays inside the 80% safe zone when masked.
 *
 * The font is a static Bold instance cut down to the one glyph "F" from the bundled
 * Lexend.ttf (OFL; fontTools instancer wght=700, variation tables removed, pyftsubset),
 * because the image renderer cannot parse the variable font itself.
 */
export async function renderAppIcon(size: number, letterRatio: number): Promise<ImageResponse> {
  const file = await readFile(join(process.cwd(), "src/ui/fonts/LexendBold-F.ttf"));
  const lexend = file.buffer.slice(
    file.byteOffset,
    file.byteOffset + file.byteLength,
  ) as ArrayBuffer;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: APP_COLOURS.primary,
        color: APP_COLOURS.onPrimary,
        fontFamily: "Lexend",
        fontWeight: 700,
        fontSize: Math.round(size * letterRatio),
      }}
    >
      F
    </div>,
    { width: size, height: size, fonts: [{ name: "Lexend", data: lexend, weight: 700 }] },
  );
}
