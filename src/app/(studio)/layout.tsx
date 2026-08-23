import { ArrasShell } from "@/components/ArrasShell";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ArrasShell>{children}</ArrasShell>;
}
