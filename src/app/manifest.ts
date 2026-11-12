import type { MetadataRoute } from "next";
import { APP_COLOURS } from "@/shared/app-colours";

/** Served at /manifest.webmanifest. No service worker: the app is installable, not offline (W4). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flipside",
    short_name: "Flipside",
    start_url: "/",
    display: "standalone",
    background_color: APP_COLOURS.surface,
    theme_color: APP_COLOURS.primary,
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      { src: "/icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
