import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Straatbeeld · ontwikkelstart",
  description: "Gemeentelijk overzicht met controleerbaar bewijs",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
