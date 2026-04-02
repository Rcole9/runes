import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Runes of the Void",
  description: "Playable browser RPG prototype built with Next.js + Phaser",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
