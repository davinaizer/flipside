import { renderAppIcon } from "./app-icon";

/** Served at /icon/192, /icon/512 and /icon/maskable (the manifest links these, F23.2). */
const ICONS = [
  { id: "192", size: 192, letterRatio: 0.62 },
  { id: "512", size: 512, letterRatio: 0.62 },
  // Letter well inside the central 80% circle that platforms keep when they mask.
  { id: "maskable", size: 512, letterRatio: 0.42 },
];

export function generateImageMetadata() {
  return ICONS.map(({ id, size }) => ({
    id,
    size: { width: size, height: size },
    contentType: "image/png",
  }));
}

export default async function Icon({ id }: { id: string | Promise<string> }) {
  const wanted = String(await id);
  const found = ICONS.find((i) => i.id === wanted) ?? ICONS[0];
  return renderAppIcon(found.size, found.letterRatio);
}
