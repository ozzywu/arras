import { Suspense } from "react";
import YarnStudio from "@/components/YarnStudio";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <p className="font-heading text-sm text-muted-foreground">
          Threading the needle…
        </p>
      }
    >
      <YarnStudio />
    </Suspense>
  );
}
