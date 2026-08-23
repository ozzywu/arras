"use client";

import { useState, type RefObject } from "react";
import {
  agentPrompt,
  embedSnippet,
  reactSnippet,
  type ArrasRecipe,
} from "@/lib/yarn-loom";
import type { YarnHoopHandle } from "./YarnHoop";

type Copied = "agent" | "embed" | "react" | "png" | null;

export function TakeThis({
  recipe,
  hoopRef,
  customImage,
}: {
  recipe: ArrasRecipe;
  hoopRef: RefObject<YarnHoopHandle | null>;
  customImage: boolean;
}) {
  const [copied, setCopied] = useState<Copied>(null);
  const [error, setError] = useState<string | null>(null);

  const flash = (which: Copied) => {
    setCopied(which);
    setError(null);
    window.setTimeout(() => setCopied((now) => (now === which ? null : now)), 1800);
  };

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const iframeOk = recipe.ground !== "site" && !customImage;

  const copyText = async (which: Copied, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(which);
    } catch {
      setError("Clipboard blocked — select the text from a prompt dump instead.");
    }
  };

  const copyPng = async () => {
    const blob = await hoopRef.current?.capturePng();
    if (!blob) {
      setError("Still threading — wait for the hoop, then copy.");
      return;
    }
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      flash("png");
    } catch {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "arras-subject.png";
      a.click();
      URL.revokeObjectURL(url);
      flash("png");
    }
  };

  return (
    <section
      className="flex flex-col gap-2 pt-3"
      style={{ borderTop: "1px solid rgba(140,90,50,0.18)" }}
    >
      <div
        className="text-[11px] tracking-[0.18em] uppercase"
        style={{ color: "#8a6d55" }}
      >
        Take this
      </div>
      <p className="text-[11px] leading-snug" style={{ color: "#8a6d55" }}>
        Like the hoop? One click copies a prompt for your coding agent, or an
        embed you can paste on a site.
      </p>

      <button
        type="button"
        onClick={() => copyText("agent", agentPrompt(origin, recipe))}
        className="py-2 text-sm"
        style={{ background: "#4a7ec7", color: "#f7f1e6" }}
      >
        {copied === "agent" ? "Copied for your agent" : "Copy for agent"}
      </button>

      <div className="grid grid-cols-3 gap-2">
        <MiniButton
          active={copied === "embed"}
          disabled={!iframeOk}
          onClick={() => copyText("embed", embedSnippet(origin, recipe))}
          title={
            iframeOk
              ? "Copy an iframe that plays this recipe on Arras"
              : customImage
                ? "Iframe cannot carry a local photo — use Copy for agent"
                : "Site fabric has to live in your page — use Copy for agent"
          }
        >
          {copied === "embed" ? "Copied" : "Embed"}
        </MiniButton>
        <MiniButton
          active={copied === "react"}
          onClick={() => copyText("react", reactSnippet(recipe))}
          title="Copy a YarnHoop JSX snippet"
        >
          {copied === "react" ? "Copied" : "React"}
        </MiniButton>
        <MiniButton
          active={copied === "png"}
          onClick={() => void copyPng()}
          title="Copy a PNG still of the hoop (transparent on site fabric)"
        >
          {copied === "png" ? "Copied" : "PNG"}
        </MiniButton>
      </div>

      <p className="text-[11px] leading-snug" style={{ color: "#8a6d55" }}>
        {customImage
          ? "Your photo stays in this tab. The agent prompt tells it to attach the same file."
          : recipe.ground === "site"
            ? "Site fabric is stitches on your page — paste Copy for agent into Cursor on that repo."
            : "Embed hosts the hoop on Arras. React / agent copies the engine into your repo."}
      </p>
      {error && (
        <p className="text-[11px]" style={{ color: "#8a3b2a" }}>
          {error}
        </p>
      )}
    </section>
  );
}

function MiniButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className="py-2 text-[11px]"
      style={{
        background: active ? "#4a7ec7" : "#e8dcc8",
        color: active ? "#f7f1e6" : "#3b3228",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );
}
