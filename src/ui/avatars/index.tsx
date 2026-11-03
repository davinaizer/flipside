import { AVATAR_IDS } from "@/shared/avatars";

const KNOWN = new Set<string>(AVATAR_IDS);

/** Decorative: the profile name next to it is the accessible label. An id outside the registry (a stale row) shows a neutral face. */
export function Avatar({ id, size = 96 }: { id: string; size?: number }) {
  if (!KNOWN.has(id)) {
    return (
      <span
        aria-hidden="true"
        className="flex items-center justify-center rounded-full bg-primary-container"
        style={{ width: size, height: size, fontSize: size * 0.55 }}
      >
        🙂
      </span>
    );
  }
  return (
    // Plain img: the files are small static 256 px WebP, so next/image would add nothing.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/avatars/${id}.webp`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}
