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

  const savePng = async () => {
    const blob = await hoopRef.current?.capturePng();
    if (!blob) {
      setError("Still threading — wait for the hoop, then save.");
      return;
    }
    const filename = `arras-${recipe.source}.png`;
    try {
      await savePngToDevice(blob, filename);
      flash("png");
    } catch (err) {
      if (isAbort(err)) return;
      setError("Could not save the PNG. Try again when the hoop is still.");
    }
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
        Like the hoop? Copy it for your agent, paste an embed, or save a PNG to
        Downloads — on a phone, Save Image in the share sheet is the camera
        roll.
      </p>

      <button
        type="button"
        onClick={() => void copyText("agent", agentPrompt(origin, recipe))}
        className="py-2 text-sm"
        style={{ background: "#4a7ec7", color: "#f7f1e6" }}
      >
        {copied === "agent" ? "Copied for your agent" : "Copy for agent"}
      </button>

      <div className="grid grid-cols-2 gap-2">
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
      </div>

      <button
        type="button"
        onClick={() => void savePng()}
        className="py-2 text-sm"
        style={{ background: "#e8dcc8", color: "#3b3228" }}
        title="Downloads on a computer. On a phone, Save Image in the share sheet puts it on the camera roll."
      >
        {copied === "png" ? "Saved" : "Save PNG"}
      </button>

      <p
        className="text-[11px] leading-snug"
        style={{ color: "#8a6d55" }}
        aria-live="polite"
      >
        {error
          ? error
          : customImage
            ? "Your photo stays in this tab. Save PNG still writes the hoop to Downloads or the camera roll."
            : recipe.ground === "site"
              ? "Site fabric is stitches on your page — Copy for agent inlines them. Save PNG keeps a linen-backed still."
              : "Save PNG goes to Downloads, or the camera roll from a phone share sheet."}
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

async function savePngToDevice(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: "image/png" });
  if (preferShareSheet() && canShareFile(file)) {
    await navigator.share({
      files: [file],
      title: "Arras hoop",
    });
    return;
  }
  downloadBlob(blob, filename);
}

function preferShareSheet(): boolean {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const appleTouch = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return coarse || appleTouch;
}

function canShareFile(file: File): boolean {
  return (
    typeof navigator.share === "function" &&
    (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }))
  );
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
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
