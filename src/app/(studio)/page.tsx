import { Suspense } from "react";
import YarnStudio from "@/components/YarnStudio";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <p
          className="text-sm"
          style={{
            color: "#6d5c4c",
            fontFamily: "var(--font-cormorant)",
          }}
        >
          Threading the needle…
        </p>
      }
    >
      <YarnStudio />
    </Suspense>
  );
}
