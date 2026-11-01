import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "Flipside" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
