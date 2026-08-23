import { createRng } from "@/lib/yarn-loom/rng";
import type { ScreenGround, ScreenParams } from "./types";

function fillBase(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ground: ScreenGround,
): void {
  if (ground === "lacquer") {
    const g = ctx.createLinearGradient(0, 0, width, 0);
    g.addColorStop(0, "#0a0807");
    g.addColorStop(0.45, "#14110f");
    g.addColorStop(1, "#0c0a08");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  if (ground === "gold") {
    const g = ctx.createLinearGradient(0, 0, width * 0.2, height);
    g.addColorStop(0, "#c9a056");
    g.addColorStop(0.4, "#e2c47a");
    g.addColorStop(0.7, "#b8893e");
    g.addColorStop(1, "#d4b46a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  if (ground === "silk") {
    ctx.fillStyle = "#e8dcc6";
    ctx.fillRect(0, 0, width, height);
    return;
  }
  ctx.fillStyle = "#eadcc4";
  ctx.fillRect(0, 0, width, height);
}

function paintGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ground: ScreenGround,
  rng: () => number,
): void {
  ctx.lineCap = "butt";
  if (ground === "lacquer") {
    ctx.strokeStyle = "rgba(255, 228, 180, 0.035)";
    ctx.lineWidth = 1.1;
    for (let x = 0; x < width; x += 5 + rng() * 3) {
      ctx.beginPath();
      const wobble = (rng() - 0.5) * 1.2;
      ctx.moveTo(x + wobble, -2);
      for (let y = 0; y < height; y += 22) {
        ctx.lineTo(x + wobble + Math.sin(y * 0.04 + x) * 0.7, y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0, 0, 0, 0.28)";
    ctx.lineWidth = 0.7;
    for (let x = 2; x < width; x += 7 + rng() * 4) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (rng() - 0.5) * 1.4, height);
      ctx.stroke();
    }
    return;
  }

  if (ground === "gold") {
    for (let i = 0; i < 220; i++) {
      const x = rng() * width;
      const y = rng() * height;
      const r = 4 + rng() * 18;
      ctx.fillStyle =
        rng() > 0.5
          ? "rgba(255, 236, 180, 0.14)"
          : "rgba(120, 80, 28, 0.12)";
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.5 + rng() * 0.6), rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  const warp = ground === "silk" ? 2.1 : 3.2;
  ctx.strokeStyle =
    ground === "silk" ? "rgba(150, 132, 104, 0.14)" : "rgba(140, 118, 88, 0.12)";
  ctx.lineWidth = 0.7;
  for (let x = 0; x < width; x += warp) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(x * 0.2) * 0.4, height);
    ctx.stroke();
  }
  ctx.strokeStyle =
    ground === "silk" ? "rgba(255, 250, 236, 0.28)" : "rgba(255, 246, 220, 0.2)";
  for (let y = 0; y < height; y += warp + 0.3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + Math.sin(y * 0.15) * 0.35);
    ctx.stroke();
  }
}

function paintCraquelure(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number,
  ground: ScreenGround,
  rng: () => number,
): void {
  if (amount < 0.02) return;
  const cracks = Math.round(40 + amount * 180);
  const light =
    ground === "lacquer"
      ? `rgba(230, 210, 170, ${0.08 + amount * 0.12})`
      : `rgba(70, 50, 28, ${0.1 + amount * 0.14})`;
  ctx.strokeStyle = light;
  ctx.lineCap = "round";
  for (let i = 0; i < cracks; i++) {
    let x = rng() * width;
    let y = rng() * height;
    const segs = 3 + ((rng() * 5) | 0);
    ctx.lineWidth = 0.35 + rng() * 0.55;
    ctx.beginPath();
    ctx.moveTo(x, y);
    let a = rng() * Math.PI * 2;
    for (let s = 0; s < segs; s++) {
      a += (rng() - 0.5) * 1.1;
      x += Math.cos(a) * (8 + rng() * 18);
      y += Math.sin(a) * (8 + rng() * 18);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function paintGoldSpeckle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number,
  rng: () => number,
): void {
  if (amount < 0.02) return;
  const n = Math.round(80 + amount * 420);
  for (let i = 0; i < n; i++) {
    const x = rng() * width;
    const y = rng() * height;
    const r = 0.35 + rng() * (0.6 + amount);
    ctx.fillStyle = `rgba(236, 210, 130, ${0.18 + rng() * 0.45 * amount})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintSheen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ground: ScreenGround,
): void {
  if (ground === "lacquer") {
    const g = ctx.createRadialGradient(
      width * 0.32,
      height * 0.22,
      10,
      width * 0.4,
      height * 0.4,
      width * 0.85,
    );
    g.addColorStop(0, "rgba(255, 230, 190, 0.07)");
    g.addColorStop(0.45, "rgba(255, 220, 170, 0.02)");
    g.addColorStop(1, "rgba(0, 0, 0, 0.28)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  if (ground === "gold") {
    const g = ctx.createRadialGradient(
      width * 0.5,
      height * 0.4,
      width * 0.1,
      width * 0.5,
      height * 0.5,
      width * 0.75,
    );
    g.addColorStop(0, "rgba(255, 244, 210, 0.08)");
    g.addColorStop(1, "rgba(80, 50, 16, 0.18)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }
}

export function paintGround(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: Pick<ScreenParams, "ground" | "craquelure" | "goldLeaf" | "seed">,
): void {
  const rng = createRng(params.seed + 91);
  fillBase(ctx, width, height, params.ground);
  paintGrain(ctx, width, height, params.ground, rng);
  paintCraquelure(ctx, width, height, params.craquelure, params.ground, rng);
  paintGoldSpeckle(ctx, width, height, params.goldLeaf, rng);
  paintSheen(ctx, width, height, params.ground);
}

export function lacquerBackgroundStyle(): {
  backgroundColor: string;
  backgroundImage: string;
} {
  return {
    backgroundColor: "#100e0c",
    backgroundImage: [
      "linear-gradient(90deg, rgba(255,220,160,0.035) 0%, transparent 42%, transparent 62%, rgba(0,0,0,0.22) 100%)",
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.016) 0px, rgba(255,255,255,0.016) 1px, transparent 1px, transparent 7px)",
    ].join(", "),
  };
}
