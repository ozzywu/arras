import { hashNoise } from "@/lib/yarn-loom/subject";
import type { Mark, RevealMode } from "./types";

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const KIND_WINDOWS: Record<
  RevealMode,
  Record<Mark["kind"], { start: number; span: number }>
> = {
  "wash-first": {
    wash: { start: 0.02, span: 0.46 },
    contour: { start: 0.36, span: 0.42 },
    vein: { start: 0.62, span: 0.28 },
    filigree: { start: 0.74, span: 0.22 },
  },
  "ink-first": {
    contour: { start: 0.02, span: 0.4 },
    vein: { start: 0.22, span: 0.32 },
    wash: { start: 0.38, span: 0.44 },
    filigree: { start: 0.72, span: 0.24 },
  },
  bloom: {
    wash: { start: 0.04, span: 0.5 },
    contour: { start: 0.2, span: 0.48 },
    vein: { start: 0.42, span: 0.36 },
    filigree: { start: 0.62, span: 0.3 },
  },
};

export function assignMarkBirths(
  marks: Mark[],
  mode: RevealMode,
  width: number,
  height: number,
): Mark[] {
  const win = KIND_WINDOWS[mode];
  const cx = width * 0.5;
  const cy = height * 0.48;
  const maxD = Math.hypot(cx, cy) || 1;

  for (const m of marks) {
    const mx = (m.x0 + m.x1) / 2;
    const my = (m.y0 + m.y1) / 2;
    const along =
      mode === "bloom"
        ? Math.hypot(mx - cx, my - cy) / maxD
        : (my / height) * 0.62 + (mx / width) * 0.28;
    const noise = hashNoise(mx, my, m.kind === "wash" ? 1 : 4) * 0.1;
    const gate = 1 - m.subject * 0.18;
    const { start, span } = win[m.kind];
    m.birth = clamp01(start + (along * 0.7 + gate * 0.18 + noise) * span);
    m.grow =
      m.kind === "wash"
        ? 0.018 + (1 - m.subject) * 0.012
        : 0.01 + (1 - m.subject) * 0.008;
  }
  return marks;
}

export function markProgress(mark: Mark, t: number): number {
  if (t <= mark.birth) return 0;
  const local = (t - mark.birth) / Math.max(0.004, mark.grow);
  return easeOutCubic(clamp01(local));
}

export function screenPlayheadEase(t: number): number {
  return 1 - Math.pow(1 - clamp01(t), 2.15);
}
