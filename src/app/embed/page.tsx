"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { imageUrlOf, parseRecipe } from "@/lib/yarn-loom";
import { YarnHoop, useYarnPlayhead } from "@/components/YarnHoop";

export default function EmbedPage() {
  return (
    <Suspense
      fallback={
        <p
          className="p-6 text-sm"
          style={{
            color: "#6d5c4c",
            fontFamily: "var(--font-cormorant)",
          }}
        >
          Threading the needle…
        </p>
      }
    >
      <EmbedHoop />
    </Suspense>
  );
}

function EmbedHoop() {
  const searchParams = useSearchParams();
  const recipe = useMemo(() => parseRecipe(searchParams), [searchParams]);
  const play = useYarnPlayhead(recipe.durationMs);
  const imageUrl = imageUrlOf(recipe);
  const site = recipe.ground === "site";

  return (
    <div
      className={site ? "bg-linen" : undefined}
      style={{
        minHeight: "100svh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: site ? 0 : 8,
        background:
          recipe.ground === "hessian"
            ? "#cbb79a"
            : recipe.ground === "linen"
              ? "#f3efe6"
              : undefined,
      }}
    >
      <YarnHoop
        recipe={recipe}
        src={imageUrl}
        t={play.t}
        fillParent
        onReady={play.begin}
        onStats={(s) => {
          if (s.busy) {
            play.setPlaying(false);
            play.setT(0);
          }
        }}
      />
    </div>
  );
}
