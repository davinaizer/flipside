import type { ReactNode } from "react";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { profileFromCookies } from "@/server/profile";
import { readSettings } from "@/server/settings";
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

export const metadata = { title: "Flipside" };

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
