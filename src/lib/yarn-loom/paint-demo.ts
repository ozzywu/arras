import { createRng } from "./rng";

type PaintCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function strokeFan(
  ctx: PaintCtx,
  ox: number,
  oy: number,
  angle: number,
  spread: number,
  count: number,
  length: number,
  width: number,
  color: string,
  rng: () => number,
): void {
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const a = angle + (t - 0.5) * spread + (rng() - 0.5) * 0.08;
    const len = length * (0.72 + rng() * 0.4);
    ctx.lineWidth = width * (0.7 + rng() * 0.6);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.cos(a) * len, oy + Math.sin(a) * len);
    ctx.stroke();
  }
}

function fillEll(
  ctx: PaintCtx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * A sun-bleached Mediterranean courtyard painted with directional strokes
 * so the flow-field extractor can follow form (arch verticals, radiating
 * palms, herringbone cobbles, hatched shirt).
 */
export function paintCourtyard(
  ctx: PaintCtx,
  w: number,
  h: number,
  seed = 3,
): void {
  const rng = createRng(seed);

  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.5);
  sky.addColorStop(0, "#c9b8c8");
  sky.addColorStop(0.55, "#e6d9c6");
  sky.addColorStop(1, "#eddcc4");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const groundY = h * 0.46;
  const ground = ctx.createLinearGradient(0, groundY, 0, h);
  ground.addColorStop(0, "#d7c3a4");
  ground.addColorStop(1, "#b9896a");
  ctx.fillStyle = ground;
  ctx.fillRect(0, groundY, w, h - groundY);

  // Distant sea band
  ctx.fillStyle = "#7a96b8";
  ctx.fillRect(0, groundY - h * 0.035, w, h * 0.04);

  // Plaster wall
  ctx.fillStyle = "#dcc9a8";
  ctx.fillRect(0, h * 0.16, w, groundY - h * 0.16 + 8);

  // Vertical plaster grain
  ctx.strokeStyle = "rgba(180, 150, 110, 0.35)";
  ctx.lineWidth = 1.4;
  for (let x = 8; x < w; x += 5) {
    ctx.beginPath();
    ctx.moveTo(x + (rng() - 0.5) * 1.5, h * 0.16);
    ctx.lineTo(x + (rng() - 0.5) * 1.5, groundY + 6);
    ctx.stroke();
  }

  // Arch
  const ax = w * 0.52;
  const ay = h * 0.5;
  const arx = w * 0.22;
  const ary = h * 0.28;
  ctx.fillStyle = "#c4a574";
  ctx.beginPath();
  ctx.moveTo(ax - arx - 18, groundY + 12);
  ctx.lineTo(ax - arx - 18, ay - ary * 0.15);
  ctx.ellipse(ax, ay - ary * 0.05, arx + 18, ary + 10, 0, Math.PI, 0, true);
  ctx.lineTo(ax + arx + 18, groundY + 12);
  ctx.closePath();
  ctx.fill();

  // Arch opening — sky + blue door
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ax - arx, groundY + 8);
  ctx.lineTo(ax - arx, ay);
  ctx.ellipse(ax, ay, arx, ary * 0.85, 0, Math.PI, 0, true);
  ctx.lineTo(ax + arx, groundY + 8);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#d8c4dc";
  ctx.fillRect(ax - arx, ay - ary, arx * 2, ary * 1.2);
  ctx.fillStyle = "#4a7ec7";
  ctx.fillRect(ax - arx * 0.55, ay - 8, arx * 1.1, groundY - (ay - 8) + 20);
  // Door panels — vertical
  ctx.strokeStyle = "rgba(30, 70, 140, 0.55)";
  ctx.lineWidth = 2;
  for (let x = ax - arx * 0.45; x < ax + arx * 0.45; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, ay - 4);
    ctx.lineTo(x, groundY + 16);
    ctx.stroke();
  }
  ctx.restore();

  // Arch voussoirs — vertical stitches will follow
  ctx.strokeStyle = "rgba(140, 100, 70, 0.45)";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  for (let a = Math.PI + 0.15; a < Math.PI * 2 - 0.15; a += 0.08) {
    const x = ax + Math.cos(a) * arx;
    const y = ay + Math.sin(a) * ary * 0.85;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 12);
    ctx.stroke();
  }

  // Palms
  const palms = [
    { x: w * 0.16, y: groundY + 6, s: 1 },
    { x: w * 0.86, y: groundY + 18, s: 0.72 },
  ];
  for (const p of palms) {
    ctx.strokeStyle = "#6e5a3c";
    ctx.lineWidth = 5 * p.s;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo(p.x + 8 * p.s, p.y - 40 * p.s, p.x - 4, p.y - 80 * p.s);
    ctx.stroke();
    strokeFan(
      ctx,
      p.x - 4,
      p.y - 80 * p.s,
      -Math.PI / 2,
      2.6,
      14,
      58 * p.s,
      3.2 * p.s,
      "#8a9a7b",
      rng,
    );
    strokeFan(
      ctx,
      p.x - 4,
      p.y - 78 * p.s,
      -Math.PI / 2 + 0.15,
      2.2,
      8,
      42 * p.s,
      2.2 * p.s,
      "#6f825f",
      rng,
    );
  }

  // Cobblestones — herringbone fans
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 14; col++) {
      const x = ((col + (row % 2) * 0.5) / 14) * w + (rng() - 0.5) * 6;
      const y = groundY + 22 + row * ((h - groundY - 30) / 9) + (rng() - 0.5) * 5;
      const rx = 16 + rng() * 10;
      const ry = 9 + rng() * 6;
      fillEll(ctx, x, y, rx, ry, rng() > 0.5 ? "#c4785a" : "#b68a68");
      fillEll(ctx, x - rx * 0.25, y - ry * 0.25, rx * 0.45, ry * 0.4, "rgba(240,210,180,0.35)");
      const fanA = row % 2 === 0 ? 0.6 : -0.6;
      strokeFan(ctx, x - 4, y, fanA, 1.1, 5, rx * 0.9, 1.3, "rgba(90,50,30,0.35)", rng);
    }
  }

  // Steps
  ctx.fillStyle = "#c4a574";
  ctx.fillRect(w * 0.28, groundY + 8, w * 0.48, 14);
  ctx.fillStyle = "#b8956c";
  ctx.fillRect(w * 0.3, groundY + 20, w * 0.44, 12);

  // Figure — bone shirt with cross-hatch
  const fx = w * 0.58;
  const fy = groundY + 4;
  ctx.fillStyle = "#e8dcc8";
  ctx.beginPath();
  ctx.ellipse(fx, fy - 18, 16, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(120, 100, 80, 0.5)";
  ctx.lineWidth = 1.2;
  for (let i = -10; i <= 10; i += 3) {
    ctx.beginPath();
    ctx.moveTo(fx + i - 8, fy - 32);
    ctx.lineTo(fx + i + 8, fy - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx + i + 8, fy - 32);
    ctx.lineTo(fx + i - 8, fy - 6);
    ctx.stroke();
  }
  ctx.fillStyle = "#c4785a";
  ctx.fillRect(fx - 12, fy - 4, 24, 16);
  fillEll(ctx, fx, fy - 42, 8, 9, "#d9c3a4");
  ctx.fillStyle = "#4a7ec7";
  ctx.fillRect(fx + 6, fy - 28, 7, 14);

  // Dusty lavender bougainvillea on the right wall
  for (let i = 0; i < 40; i++) {
    const x = w * 0.78 + rng() * w * 0.18;
    const y = h * 0.2 + rng() * h * 0.22;
    fillEll(ctx, x, y, 3 + rng() * 5, 2 + rng() * 4, rng() > 0.3 ? "#b7a4b8" : "#8a9a7b");
  }
}
