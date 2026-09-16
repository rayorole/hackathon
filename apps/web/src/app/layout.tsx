import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistHeading = Geist({subsets:['latin'],variable:'--font-heading'});

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vestigingsbeeld · KBO Evidence Desk",
  description:
    "Welke ondernemingen zijn actief in deze straat, en waarop baseren we dat?",
};

// The officer-facing interface is Dutch throughout — an event rule, see AGENTS.md §2.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="nl"
      className={cn("h-full", "antialiased", geistMono.variable, "font-sans", inter.variable, geistHeading.variable)}
    >
      <body className="min-h-full flex flex-col"><TooltipProvider>{children}</TooltipProvider></body>
    </html>
  );
}
