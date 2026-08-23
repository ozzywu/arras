"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ATELIERS, type AtelierId } from "@/lib/ateliers";
import { lacquerBackgroundStyle } from "@/lib/screen-atelier/ground";
import { ArrasShell } from "./ArrasShell";

const YarnStudio = dynamic(() => import("./YarnStudio"), { ssr: false });
const ScreenStudio = dynamic(() => import("./ScreenStudio"), { ssr: false });

export default function AtelierApp() {
  const [atelier, setAtelier] = useState<AtelierId>("screen");
  const meta = ATELIERS[atelier];

  return (
    <div
      className="min-h-screen"
      data-atelier={atelier}
      style={
        atelier === "screen"
          ? { ...lacquerBackgroundStyle(), color: "#e6d3a4" }
          : undefined
      }
    >
      <ArrasShell
        atelier={atelier}
        title={meta.title}
        blurb={meta.blurb}
        onAtelierChange={setAtelier}
      >
        {atelier === "yarn" ? <YarnStudio /> : <ScreenStudio />}
      </ArrasShell>
    </div>
  );
}
