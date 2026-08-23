import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Space_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["300", "400", "500", "600"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Arras — Modern interpretation of medieval tapestry",
  description:
    "Drop a photo. It gets woven into the cloth. Copy the hoop onto a site — no account.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "font-sans",
        geist.variable,
        cormorant.variable,
        spaceMono.variable,
      )}
    >
      <body className="min-h-svh antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
