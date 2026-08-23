import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ArrasShell } from "@/components/ArrasShell";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Arras",
  description: "Drop a photo. It gets woven into the cloth.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <ArrasShell>{children}</ArrasShell>
      </body>
    </html>
  );
}
