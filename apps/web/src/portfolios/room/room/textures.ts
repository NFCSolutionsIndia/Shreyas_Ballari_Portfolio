import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';

/** Small deterministic PRNG so textures are identical on every visit. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, color = true) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx);
  const t = new CanvasTexture(canvas);
  if (color) t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function tile<T extends Texture>(t: T, x: number, y: number) {
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.repeat.set(x, y);
  return t;
}

/** Fine speckle so flat fills read as a real surface. */
function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, count: number, alpha: number, seed: number) {
  const rand = rng(seed);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand(), 1 + rand());
  }
}

/**
 * Natural oak floor: 20 cm boards in random lengths running the depth of the room, each with
 * its own tone, wavy grain, cathedral figure, the odd knot and bevelled seams. One texture tile
 * is 2 × 2 m; the bump map shares the board layout so the seams catch the light.
 */
export function oakFloor(width: number, depth: number) {
  const S = 2048;
  const cols = 10;
  const bw = S / cols;
  const rand = rng(21);
  const boards: { x: number; y: number; len: number; tone: number; hue: number; seed: number }[] = [];
  for (let c = 0; c < cols; c++) {
    let y = -rand() * S * 0.7;
    while (y < S) {
      const len = S * (0.6 + rand() * 0.4);
      boards.push({ x: c * bw, y, len, tone: rand(), hue: rand(), seed: Math.floor(rand() * 1e6) });
      y += len;
    }
  }
  // Boards that run past the bottom edge are drawn again at the top so the tile repeats cleanly.
  const copies = (y: number, len: number) => [y, y + len > S ? y - S : null, y < 0 ? y + S : null].filter((v): v is number => v !== null);

  const map = canvasTexture(S, S, (ctx) => {
    for (const b of boards) {
      for (const y of copies(b.y, b.len)) {
        const r = rng(b.seed);
        ctx.fillStyle = `hsl(${29 + b.hue * 4} ${42 + b.hue * 8}% ${47 + b.tone * 7}%)`;
        ctx.fillRect(b.x, y, bw, b.len);
        const shade = ctx.createLinearGradient(b.x, 0, b.x + bw, 0);
        shade.addColorStop(0, 'rgba(90,55,25,0.07)');
        shade.addColorStop(0.5, 'rgba(255,240,220,0.05)');
        shade.addColorStop(1, 'rgba(90,55,25,0.08)');
        ctx.fillStyle = shade;
        ctx.fillRect(b.x, y, bw, b.len);
        // Grain
        for (let i = 0; i < 46; i++) {
          const gx = b.x + r() * bw;
          const amp = 1 + r() * 5;
          const phase = r() * 6;
          const freq = 0.6 + r() * 2.2;
          ctx.strokeStyle = `rgba(95,58,28,${0.03 + r() * 0.1})`;
          ctx.lineWidth = 0.5 + r() * 1.6;
          ctx.beginPath();
          ctx.moveTo(gx, y);
          for (let s = 1; s <= 28; s++) {
            ctx.lineTo(gx + Math.sin(phase + (s / 28) * freq * Math.PI * 2) * amp, y + (b.len * s) / 28);
          }
          ctx.stroke();
        }
        // Cathedral figure
        if (r() < 0.65) {
          const cx = b.x + bw * (0.3 + r() * 0.4);
          const top = y + r() * b.len * 0.55;
          const rise = b.len * (0.18 + r() * 0.25);
          for (let k = 0; k < 8; k++) {
            const w = 6 + k * 10;
            ctx.strokeStyle = `rgba(105,65,30,${0.05 + r() * 0.07})`;
            ctx.lineWidth = 1 + r();
            ctx.beginPath();
            ctx.moveTo(cx - w, top + rise + k * 16);
            ctx.quadraticCurveTo(cx, top - rise * 0.25 + k * 12, cx + w, top + rise + k * 16);
            ctx.stroke();
          }
        }
        // Knot
        if (r() < 0.22) {
          const kx = b.x + bw * (0.2 + r() * 0.6);
          const ky = y + r() * b.len;
          const g = ctx.createRadialGradient(kx, ky, 0, kx, ky, 14);
          g.addColorStop(0, 'rgba(70,40,18,0.6)');
          g.addColorStop(1, 'rgba(70,40,18,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(kx, ky, 7, 14, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Bevelled seams
        ctx.fillStyle = 'rgba(55,32,15,0.5)';
        ctx.fillRect(b.x, y, 2, b.len);
        ctx.fillRect(b.x, y, bw, 2);
        ctx.fillStyle = 'rgba(255,238,215,0.14)';
        ctx.fillRect(b.x + 2, y, 1, b.len);
      }
    }
    speckle(ctx, S, S, 60000, 0.035, 4);
  });

  const bump = canvasTexture(
    S,
    S,
    (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = '#000000';
      for (const b of boards) {
        for (const y of copies(b.y, b.len)) {
          ctx.fillRect(b.x, y, 3, b.len);
          ctx.fillRect(b.x, y, bw, 3);
        }
      }
    },
    false,
  );

  return { map: tile(map, width / 2, depth / 2), bump: tile(bump, width / 2, depth / 2) };
}

/** Soft limewash plaster: mottled tone over a flat colour. */
export function plaster(base: string, seed = 3) {
  return tile(
    canvasTexture(512, 512, (ctx) => {
      const rand = rng(seed);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 260; i++) {
        const x = rand() * 512;
        const y = rand() * 512;
        const r = 30 + rand() * 90;
        const light = rand() > 0.5;
        for (const [dx, dy] of [[0, 0], [512, 0], [-512, 0], [0, 512], [0, -512]] as const) {
          const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
          g.addColorStop(0, light ? 'rgba(255,255,255,0.022)' : 'rgba(60,45,30,0.018)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
        }
      }
      speckle(ctx, 512, 512, 9000, 0.025, seed + 1);
    }),
    5,
    1.5,
  );
}

/** Walnut veneer for furniture. */
export function walnut(seed = 8) {
  return canvasTexture(512, 512, (ctx) => {
    const rand = rng(seed);
    ctx.fillStyle = '#5e3c27';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 90; i++) {
      const y = rand() * 512;
      const amp = 2 + rand() * 8;
      const phase = rand() * 6;
      ctx.strokeStyle = rand() > 0.4 ? `rgba(30,16,8,${0.08 + rand() * 0.18})` : `rgba(160,110,70,${0.06 + rand() * 0.1})`;
      ctx.lineWidth = 0.6 + rand() * 2.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let s = 1; s <= 24; s++) ctx.lineTo((512 * s) / 24, y + Math.sin(phase + s * 0.35) * amp);
      ctx.stroke();
    }
    speckle(ctx, 512, 512, 6000, 0.04, seed + 2);
  });
}

/** White marble with soft grey veins. */
export function marble(seed = 12) {
  return canvasTexture(512, 512, (ctx) => {
    const rand = rng(seed);
    ctx.fillStyle = '#f2efea';
    ctx.fillRect(0, 0, 512, 512);
    ctx.filter = 'blur(1px)';
    for (let v = 0; v < 9; v++) {
      let x = rand() * 512;
      let y = rand() * 512;
      let a = rand() * Math.PI * 2;
      ctx.strokeStyle = `rgba(120,118,115,${0.12 + rand() * 0.3})`;
      ctx.lineWidth = 0.6 + rand() * 2.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 60; s++) {
        a += (rand() - 0.5) * 0.6;
        x += Math.cos(a) * 9;
        y += Math.sin(a) * 9;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.filter = 'none';
    speckle(ctx, 512, 512, 4000, 0.02, seed + 1);
  });
}

/** Wool rug: cream field, terracotta and green border, a quiet lattice and fibre texture. */
export function rug() {
  return canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = '#e9e0d1';
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.strokeStyle = 'rgba(176,150,118,0.35)';
    ctx.lineWidth = 3;
    for (let i = -1024; i < 2048; i += 96) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 1024, 1024);
      ctx.moveTo(i, 1024);
      ctx.lineTo(i + 1024, 0);
      ctx.stroke();
    }
    // Medallion
    ctx.save();
    ctx.translate(512, 512);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = 'rgba(52,72,60,0.55)';
    ctx.lineWidth = 10;
    ctx.strokeRect(-150, -150, 300, 300);
    ctx.strokeStyle = 'rgba(178,96,63,0.6)';
    ctx.lineWidth = 6;
    ctx.strokeRect(-110, -110, 220, 220);
    ctx.restore();
    // Border
    ctx.fillStyle = '#b2603f';
    for (const [x, y, w, h] of [[40, 40, 944, 26], [40, 958, 944, 26], [40, 40, 26, 944], [958, 40, 26, 944]] as const) ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#34483c';
    ctx.lineWidth = 6;
    ctx.strokeRect(90, 90, 844, 844);
    speckle(ctx, 1024, 1024, 70000, 0.05, 9);
  });
}

/** Warm glow fading down the wall from the cove light. */
export function wallWash() {
  return canvasTexture(16, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,214,160,0.3)');
    g.addColorStop(0.35, 'rgba(255,214,160,0.1)');
    g.addColorStop(1, 'rgba(255,214,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 256);
  });
}

/** The view through the window: soft sky, distant headland and a calm sea. */
export function seaView() {
  return canvasTexture(1024, 768, (ctx) => {
    const sky = ctx.createLinearGradient(0, 0, 0, 430);
    sky.addColorStop(0, '#b9d4ea');
    sky.addColorStop(0.7, '#e9e6e0');
    sky.addColorStop(1, '#f6e7d4');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1024, 430);
    // Headland
    ctx.fillStyle = '#a3b3b4';
    ctx.beginPath();
    ctx.moveTo(560, 430);
    ctx.bezierCurveTo(680, 360, 820, 372, 1024, 392);
    ctx.lineTo(1024, 430);
    ctx.fill();
    const sea = ctx.createLinearGradient(0, 430, 0, 768);
    sea.addColorStop(0, '#6aa3c0');
    sea.addColorStop(1, '#2c6688');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 430, 1024, 338);
    // Glints
    const rand = rng(5);
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.45})`;
      const y = 436 + rand() * 320;
      ctx.fillRect(rand() * 1024, y, 6 + rand() * 26 * (y / 768), 1.5);
    }
  });
}

/** Monitor wallpaper: soft colour blobs, with the Oncure title. */
export function monitorScreen() {
  return canvasTexture(640, 400, (ctx) => {
    ctx.fillStyle = '#1b1530';
    ctx.fillRect(0, 0, 640, 400);
    const blobs: [number, number, number, string][] = [
      [200, 220, 260, 'rgba(255,90,140,0.85)'],
      [420, 160, 240, 'rgba(120,90,255,0.85)'],
      [360, 320, 220, 'rgba(255,170,60,0.8)'],
    ];
    for (const [x, y, r, c] of blobs) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, c);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 640, 400);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '600 44px "Schibsted Grotesk Variable", system-ui, sans-serif';
    ctx.fillText('ONCURE', 40, 70);
    ctx.font = '400 18px "Schibsted Grotesk Variable", system-ui, sans-serif';
    ctx.fillText('Research concept · AI guided nanobots', 40, 100);
  });
}

/** A calm modern print for the gallery wall; the seed picks one of four compositions. */
export function galleryPrint(seed: number, palette: [string, string, string]) {
  return canvasTexture(400, 500, (ctx) => {
    const rand = rng(seed);
    const [bg, mid, deep] = palette;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 400, 500);
    switch (seed % 4) {
      case 0: {
        // Arch with a setting sun
        ctx.fillStyle = mid;
        ctx.beginPath();
        ctx.moveTo(90, 440);
        ctx.lineTo(90, 230);
        ctx.arc(200, 230, 110, Math.PI, 0);
        ctx.lineTo(310, 440);
        ctx.fill();
        ctx.fillStyle = deep;
        ctx.beginPath();
        ctx.arc(200, 300, 52, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 1: {
        // Layered hills
        [mid, deep].forEach((c, i) => {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.moveTo(0, 300 + i * 70);
          ctx.bezierCurveTo(120, 230 + i * 60 + rand() * 30, 260, 330 + i * 50, 400, 260 + i * 80);
          ctx.lineTo(400, 500);
          ctx.lineTo(0, 500);
          ctx.fill();
        });
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(290, 140, 34, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 2: {
        // Overlapping circles
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = mid;
        ctx.beginPath();
        ctx.arc(160, 210, 110, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = deep;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(250, 300, 90, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      default: {
        // Horizon line and reflection
        ctx.fillStyle = mid;
        ctx.fillRect(0, 280, 400, 220);
        ctx.fillStyle = deep;
        ctx.fillRect(0, 276, 400, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        for (let i = 0; i < 8; i++) ctx.fillRect(150 + rand() * 60, 300 + i * 20, 40 + rand() * 50, 2);
      }
    }
    speckle(ctx, 400, 500, 5000, 0.03, seed);
  });
}

/** Soft rectangle of light, used for the sun patches on the floor. */
export function lightPatch() {
  return canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,248,232,0.95)');
    g.addColorStop(0.6, 'rgba(255,244,222,0.55)');
    g.addColorStop(1, 'rgba(255,240,215,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
}

/** Whiteboard notes in blue marker. */
export function whiteboardNotes() {
  return canvasTexture(800, 500, (ctx) => {
    ctx.fillStyle = '#fbfbfa';
    ctx.fillRect(0, 0, 800, 500);
    ctx.fillStyle = '#2346c8';
    ctx.font = '700 46px Caveat, "Comic Sans MS", cursive';
    const lines = ['1. draw it', '2. break it down', '3. try one together', '4. you’ve got it!'];
    lines.forEach((l, i) => ctx.fillText(l, 50, 100 + i * 95));
    ctx.strokeStyle = '#e04f3c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(640, 330, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e04f3c';
    ctx.fillText('★', 618, 345);
  });
}

/**
 * A framed achievement card for the gallery wall: cream paper, a fine border, the milestone and
 * a gold seal. Deliberately a portfolio card, not a copy of any real certificate: no logos, no
 * signatures.
 */
export function achievementCard({ kind, title, detail, year, accent, note }: {
  kind: string;
  title: string;
  detail: string;
  year: string;
  accent: string;
  note?: string;
}) {
  return canvasTexture(840, 600, (ctx) => {
    ctx.fillStyle = '#fbf6ec';
    ctx.fillRect(0, 0, 840, 600);
    speckle(ctx, 840, 600, 9000, 0.025, title.length);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(28, 28, 784, 544);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(44, 44, 752, 512);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = '600 22px "Schibsted Grotesk Variable", system-ui, sans-serif';
    ctx.fillText(kind.toUpperCase().split('').join(' '), 420, 120);
    ctx.fillStyle = '#1d1b18';
    let size = 62;
    ctx.font = `600 ${size}px "Schibsted Grotesk Variable", system-ui, sans-serif`;
    while (ctx.measureText(title).width > 680 && size > 30) {
      size -= 2;
      ctx.font = `600 ${size}px "Schibsted Grotesk Variable", system-ui, sans-serif`;
    }
    ctx.fillText(title, 420, 220);
    ctx.fillStyle = '#5a5248';
    ctx.font = '400 26px "Schibsted Grotesk Variable", system-ui, sans-serif';
    detail.split('\n').forEach((l, i) => ctx.fillText(l, 420, 285 + i * 36));
    ctx.fillStyle = '#1d1b18';
    ctx.font = '500 24px "Schibsted Grotesk Variable", system-ui, sans-serif';
    ctx.fillText('Shreyas Ballari', 420, 470);
    ctx.fillStyle = '#8a8276';
    ctx.font = '400 20px "Schibsted Grotesk Variable", system-ui, sans-serif';
    ctx.fillText(year, 420, 504);
    // Gold seal
    const sx = 690;
    const sy = 455;
    ctx.fillStyle = '#c9a25a';
    ctx.beginPath();
    for (let i = 0; i < 32; i++) {
      const r = i % 2 ? 52 : 60;
      const a = (i / 32) * Math.PI * 2;
      ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
    }
    ctx.fill();
    ctx.fillStyle = '#e3c27f';
    ctx.beginPath();
    ctx.arc(sx, sy, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a8813d';
    ctx.font = '700 34px system-ui, sans-serif';
    ctx.fillText('★', sx, sy + 12);
    if (note) {
      ctx.fillStyle = '#b2603f';
      ctx.font = '600 18px "Schibsted Grotesk Variable", system-ui, sans-serif';
      ctx.fillText(note, 150, 504);
    }
  });
}
