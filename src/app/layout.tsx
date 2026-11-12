import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { profileFromCookies } from "@/server/profile";
import { readSettings } from "@/server/settings";
import { APP_COLOURS } from "@/shared/app-colours";
import "./globals.css";

const atkinson = localFont({
  src: "../ui/fonts/AtkinsonHyperlegibleNext.ttf",
  variable: "--font-atkinson",
  weight: "200 800",
  display: "swap",
});
const lexend = localFont({
  src: "../ui/fonts/Lexend.ttf",
  variable: "--font-lexend",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flipside",
  appleWebApp: { capable: true, title: "Flipside", statusBarStyle: "default" },
  icons: { apple: "/apple-icon" },
};

// viewport-fit=cover lets content reach the screen edges; F23.3 keeps it inside the safe areas.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: APP_COLOURS.surface },
    { media: "(prefers-color-scheme: dark)", color: APP_COLOURS.surfaceDark },
  ],
};

export const dynamic = "force-dynamic";

/** The profile's stored theme is rendered here so a reload shows it from the first paint; no profile means light. */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const profile = await profileFromCookies(await cookies());
  const theme = profile ? readSettings(profile.settings).theme : "light";
  return (
    <html lang="en" data-theme={theme} className={`${atkinson.variable} ${lexend.variable}`}>
      <body>{children}</body>
    </html>
  );
}
