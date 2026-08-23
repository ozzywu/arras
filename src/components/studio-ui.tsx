"use client";

import { useRef } from "react";

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  columns,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; title?: string }[];
  onChange: (id: T) => void;
  columns?: 2;
}) {
  return (
    <div>
      <div className="text-[13px] font-medium text-muted mb-2">{label}</div>
      <div
        role="radiogroup"
        aria-label={label}
        className={
          columns === 2
            ? "grid grid-cols-2 gap-1 p-1 rounded-2xl bg-well"
            : "flex gap-1 p-1 rounded-full bg-well"
        }
      >
        {options.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={option.title}
              onClick={() => onChange(option.id)}
              className={`min-h-11 px-3 text-[14px] font-medium leading-none ${
                columns === 2 ? "rounded-xl" : "flex-1 rounded-full"
              }`}
              style={{
                background: active ? "#ffffff" : "transparent",
                color: active ? "#111111" : "#717171",
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display?: string;
}) {
  return (
    <label className="block">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[15px] font-medium">{label}</span>
        <span className="text-[13px] tabular-nums text-muted">
          {display ?? value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="loom-range"
      />
    </label>
  );
}

export function SourceTile({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className="relative shrink-0 overflow-hidden rounded-2xl"
      style={{
        width: 64,
        height: 80,
        boxShadow: active
          ? "0 0 0 2px #111111"
          : "0 0 0 1px var(--line)",
      }}
    >
      {children}
    </button>
  );
}

export function CourtyardThumb() {
  return (
    <svg viewBox="0 0 56 72" className="h-full w-full" aria-hidden>
      <rect width="56" height="72" fill="#d8d4cc" />
      <rect y="46" width="56" height="26" fill="#8a9874" />
      <rect x="6" y="14" width="44" height="40" fill="#ece8e0" />
      <path d="M10 48 V24 A18 15 0 0 1 46 24 V48" fill="#f7f6f3" />
      <rect x="24" y="38" width="8" height="18" fill="#3f3f3f" />
    </svg>
  );
}

export function PlusMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M8 3v10M3 8h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M4 2.6 11.2 7 4 11.4Z" fill="currentColor" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <rect x="3.4" y="2.6" width="2.4" height="8.8" rx="0.4" fill="currentColor" />
      <rect x="8.2" y="2.6" width="2.4" height="8.8" rx="0.4" fill="currentColor" />
    </svg>
  );
}

function IconReplay() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path
        d="M11.2 7A4.2 4.2 0 1 1 8.4 3.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M8.2 1.6 10.6 3.4 8 4.8" fill="currentColor" />
    </svg>
  );
}

function IconToStart() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <rect x="2.4" y="2.8" width="1.4" height="8.4" fill="currentColor" />
      <path d="M11.4 2.8 5.4 7l6 4.2Z" fill="currentColor" />
    </svg>
  );
}

export function Transport({
  playing,
  t,
  busy,
  stitchCount,
  passages,
  onToggle,
  onRewind,
  onScrub,
}: {
  playing: boolean;
  t: number;
  busy: boolean;
  stitchCount: number;
  passages: number;
  onToggle: () => void;
  onRewind: () => void;
  onScrub: (next: number) => void;
}) {
  const ended = t >= 1;
  const playLabel = playing ? "Pause" : ended ? "Replay" : "Play";

  return (
    <div className="bg-black/80 px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Rewind"
          onClick={onRewind}
          className="grid place-items-center h-10 w-10 shrink-0 text-white"
        >
          <IconToStart />
        </button>
        <button
          type="button"
          aria-label={playLabel}
          disabled={busy}
          onClick={onToggle}
          className="grid place-items-center h-9 w-9 shrink-0 rounded-full bg-white text-ink"
        >
          {playing ? <IconPause /> : ended ? <IconReplay /> : <IconPlay />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={t}
          disabled={busy}
          onChange={(e) => onScrub(Number(e.target.value))}
          aria-label="Playhead"
          className="loom-range loom-range-light flex-1"
        />
      </div>
      <p className="mt-0.5 px-2 text-[11px] tabular-nums text-white/70">
        {busy
          ? "Threading…"
          : `${stitchCount.toLocaleString()} stitches · ${passages} passages`}
      </p>
    </div>
  );
}

export function LightOrbit({
  angle,
  onChange,
}: {
  angle: number;
  onChange: (angle: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const size = 128;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 44;
  const lampA = angle + Math.PI;
  const lampX = cx + Math.cos(lampA) * radius;
  const lampY = cy + Math.sin(lampA) * radius;

  const setFromEvent = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * size - cx;
    const y = ((e.clientY - rect.top) / rect.height) * size - cy;
    if (x * x + y * y < 4) return;
    let next = Math.atan2(y, x) + Math.PI;
    while (next > Math.PI) next -= Math.PI * 2;
    while (next < -Math.PI) next += Math.PI * 2;
    onChange(next);
  };

  return (
    <div>
      <div className="text-[13px] font-medium text-muted mb-2">Light</div>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${size} ${size}`}
        className="block mx-auto select-none"
        style={{ maxWidth: 148, touchAction: "none", cursor: "grab" }}
        aria-label="Light direction"
        onPointerDown={(e) => {
          dragging.current = true;
          (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
          e.currentTarget.style.cursor = "grabbing";
          setFromEvent(e);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          setFromEvent(e);
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          e.currentTarget.style.cursor = "grab";
        }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#d4d4d4"
          strokeWidth="1.5"
          strokeDasharray="3 4"
        />
        <line
          x1={lampX}
          y1={lampY}
          x2={cx}
          y2={cy}
          stroke="#a3a3a3"
          strokeWidth="1.25"
        />
        <circle cx={cx} cy={cy} r="9" fill="#e5e5e5" stroke="#a3a3a3" strokeWidth="1" />
        <circle cx={cx} cy={cy} r="2" fill="#111111" />
        <circle
          cx={lampX}
          cy={lampY}
          r="8"
          fill="#facc15"
          stroke="#111111"
          strokeWidth="1.25"
        />
      </svg>
    </div>
  );
}
