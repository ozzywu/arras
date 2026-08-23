import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arras hoop",
  robots: { index: false, follow: false },
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-svh overflow-hidden">{children}</div>;
}
