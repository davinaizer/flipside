import type { ReactNode } from "react";
import localFont from "next/font/local";
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${atkinson.variable} ${lexend.variable}`}>
      <body>{children}</body>
    </html>
  );
}
