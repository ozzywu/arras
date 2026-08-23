"use client";

import { useRef, useState, type RefObject } from "react";
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
  const [dump, setDump] = useState<{ label: string; text: string } | null>(null);
  const dumpRef = useRef<HTMLTextAreaElement>(null);

  const flash = (which: Copied) => {
    setCopied(which);
    setError(null);
    window.setTimeout(() => setCopied((now) => (now === which ? null : now)), 1800);
  };

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const iframeOk = recipe.ground !== "site" && !customImage;

  const copyText = async (which: Copied, text: string) => {
    flash(which);
    try {
      const ok = await tryCopyText(text);
      if (ok) {
        setDump(null);
        return;
      }
      setDump({
        label:
          which === "agent"
            ? "Agent prompt"
            : which === "embed"
              ? "Iframe embed"
              : "React snippet",
        text,
      });
      setError("Clipboard blocked in this browser — the text is selected below.");
      window.setTimeout(() => dumpRef.current?.select(), 0);
    } catch (err) {
      setDump({ label: "Copy payload", text });
      setError(err instanceof Error ? err.message : "Copy failed — text is below.");
      window.setTimeout(() => dumpRef.current?.select(), 0);
    }
  };

  const copyPng = async () => {
    const blob = await hoopRef.current?.capturePng();
    if (!blob) {
      setError("Still threading — wait for the hoop, then copy.");
      return;
    }
    const clipOk = await tryCopyPng(blob);
    if (clipOk) {
      flash("png");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "arras-subject.png";
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash("png");
  };

  return (
    <section
      className="flex flex-col gap-2 pb-3"
      style={{ borderBottom: "1px solid rgba(140,90,50,0.18)" }}
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
        onClick={() => void copyText("agent", agentPrompt(origin, recipe))}
        className="py-2 text-sm"
        style={{ background: "#4a7ec7", color: "#f7f1e6" }}
      >
        {copied === "agent" ? "Copied for your agent" : "Copy for agent"}
      </button>

      <div className="grid grid-cols-3 gap-2">
        <MiniButton
          active={copied === "embed"}
          disabled={!iframeOk}
          onClick={() => void copyText("embed", embedSnippet(origin, recipe))}
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
          onClick={() => void copyText("react", reactSnippet(recipe))}
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

      <p
        className="text-[11px] leading-snug"
        style={{ color: "#8a6d55" }}
        aria-live="polite"
      >
        {error
          ? error
          : customImage
            ? "Your photo stays in this tab. The agent prompt tells it to attach the same file."
            : recipe.ground === "site"
              ? "Site fabric is stitches on your page — paste Copy for agent into Cursor on that repo."
              : "Embed hosts the hoop on Arras. React / agent copies the engine into your repo."}
      </p>
      {dump && (
        <textarea
          ref={dumpRef}
          readOnly
          aria-label={dump.label}
          value={dump.text}
          rows={8}
          className="w-full text-[10px] p-2"
          style={{
            fontFamily: "var(--font-space-mono)",
            color: "#3b3228",
            background: "#f7f1e6",
            border: "1px solid rgba(140,90,50,0.22)",
            resize: "vertical",
          }}
          onFocus={(e) => e.currentTarget.select()}
        />
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

async function tryCopyText(text: string): Promise<boolean> {
  try {
    const api = navigator.clipboard?.writeText?.(text);
    if (api) {
      const copied = await race(api.then(() => true), 900);
      if (copied) return true;
    }
  } catch {
    // NotAllowedError is often thrown synchronously when the tab is unfocused.
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

async function tryCopyPng(blob: Blob): Promise<boolean> {
  if (!navigator.clipboard?.write) return false;
  try {
    const item = new ClipboardItem({ "image/png": blob });
    const copied = await race(
      navigator.clipboard.write([item]).then(() => true),
      900,
    );
    return copied;
  } catch {
    return false;
  }
}

function race(promise: Promise<boolean>, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const id = window.setTimeout(() => resolve(false), ms);
    promise
      .then((value) => {
        window.clearTimeout(id);
        resolve(value);
      })
      .catch(() => {
        window.clearTimeout(id);
        resolve(false);
      });
  });
}
