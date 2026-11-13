import { useEffect, useRef, useState } from 'react';
import { profile } from '@/content/portfolio';
import './holo.css';

/**
 * Hero: a CRT hologram. His portrait is rebuilt from thousands of glowing dots in front of a
 * curved wireframe grid; scan lines, a slow flicker and a glitch band that sweeps down the screen
 * finish the look. The head turns a little towards the pointer (the dots near the middle of the
 * face move further than the edges, which reads as a turn). Scrolling bends the screen away.
 * A short boot screen ("LOADING") plays while the portrait loads.
 */

const CUTOUT = `${import.meta.env.BASE_URL}assets/shreyas/hero-cutout.png`;
const IMG_RATIO = 1293 / 1216;

interface Dot {
  x: number;
  y: number;
  l: number; // brightness 0..1
  d: number; // depth weight 0..1 (how much it moves when the head turns)
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function HoloHero() {
  const section = useRef<HTMLElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [booted, setBooted] = useState(false);
  const [load, setLoad] = useState(0);

  useEffect(() => {
    const cv = canvas.current;
    const sec = section.current;
    if (!cv || !sec) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const img = new Image();
    img.decoding = 'async';
    img.src = CUTOUT;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let step = 5;
    let dots: Dot[] = [];
    let grid: HTMLCanvasElement | null = null;
    let face = { x: 0, y: 0 };
    let raf = 0;
    let visible = true;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const buildGrid = () => {
      const g = document.createElement('canvas');
      g.width = W * dpr;
      g.height = H * dpr;
      const c = g.getContext('2d')!;
      c.scale(dpr, dpr);
      const cx = W / 2;
      const cy = H / 2;
      // Barrel bend: lines bow outwards towards the top and bottom, like a curved tube screen.
      const map = (u: number, v: number): [number, number] => [cx + u * (W / 2) * (1 + 0.1 * v * v), cy + v * (H / 2) * (1 + 0.035 * u * u)];
      // A violet glow behind the grid, like the sparkle screen further down.
      const glow = c.createRadialGradient(W * 0.68, H * 0.55, 0, W * 0.68, H * 0.55, Math.max(W, H) * 0.6);
      glow.addColorStop(0, 'rgba(70, 60, 200, 0.38)');
      glow.addColorStop(1, 'rgba(6, 8, 32, 0)');
      c.fillStyle = glow;
      c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(175, 160, 255, 0.3)';
      c.lineWidth = 1;
      const cols = Math.max(18, Math.round(W / 46));
      const rows = Math.max(8, Math.round(H / 74));
      for (let i = 0; i <= cols; i++) {
        const u = (i / cols) * 2.3 - 1.15;
        c.beginPath();
        for (let k = 0; k <= 40; k++) {
          const [x, y] = map(u, (k / 40) * 2.3 - 1.15);
          if (k) c.lineTo(x, y);
          else c.moveTo(x, y);
        }
        c.stroke();
      }
      for (let j = 0; j <= rows; j++) {
        const v = (j / rows) * 2.3 - 1.15;
        c.beginPath();
        for (let k = 0; k <= 60; k++) {
          const [x, y] = map((k / 60) * 2.3 - 1.15, v);
          if (k) c.lineTo(x, y);
          else c.moveTo(x, y);
        }
        c.stroke();
      }
      // A few cells split into finer squares, denser towards the middle (a "scanning" texture).
      const r = seeded(7);
      c.strokeStyle = 'rgba(175, 160, 255, 0.18)';
      for (let n = 0; n < cols * rows * 0.22; n++) {
        const i = Math.floor(r() * cols);
        const j = Math.floor(r() * rows);
        const mid = 1 - Math.abs(i / cols - 0.5) * 2;
        if (r() > 0.35 + mid * 0.6) continue;
        const u0 = (i / cols) * 2.3 - 1.15;
        const v0 = (j / rows) * 2.3 - 1.15;
        const du = 2.3 / cols;
        const dv = 2.3 / rows;
        const parts = r() < 0.5 ? 2 : 4;
        for (let p = 1; p < parts; p++) {
          const [ax, ay] = map(u0 + (du * p) / parts, v0);
          const [bx, by] = map(u0 + (du * p) / parts, v0 + dv);
          c.beginPath();
          c.moveTo(ax, ay);
          c.lineTo(bx, by);
          c.stroke();
          const [ex, ey] = map(u0, v0 + (dv * p) / parts);
          const [fx, fy] = map(u0 + du, v0 + (dv * p) / parts);
          c.beginPath();
          c.moveTo(ex, ey);
          c.lineTo(fx, fy);
          c.stroke();
        }
      }
      grid = g;
    };

    const buildDots = () => {
      if (!img.complete || !img.naturalWidth) return;
      // The portrait stands at the bottom centre, nearly full height.
      // On narrow screens the bust is allowed wider than the screen (the shoulders crop).
      const ph = W < 760 ? Math.min(H * 0.72, (W * 1.5) / IMG_RATIO) : Math.min(H * 0.98, (W * 0.95) / IMG_RATIO);
      const pw = ph * IMG_RATIO;
      const px = (W - pw) / 2;
      const py = H - ph;
      step = W < 700 ? 4 : W < 1200 ? 5 : 6;
      const cols = Math.floor(pw / step);
      const rows = Math.floor(ph / step);
      const off = document.createElement('canvas');
      off.width = cols;
      off.height = rows;
      const oc = off.getContext('2d', { willReadFrequently: true })!;
      oc.drawImage(img, 0, 0, cols, rows);
      const data = oc.getImageData(0, 0, cols, rows).data;
      face = { x: px + pw * 0.5, y: py + ph * 0.36 };
      const reach = pw * 0.32;
      // Spread the brightness over the full range (2nd to 98th percentile), then lift the
      // shadows, so the darker side of the face still shows as dots instead of holes.
      const lums: number[] = [];
      for (let k = 0; k < data.length; k += 4) if (data[k + 3]! > 100) lums.push(0.3 * data[k]! + 0.59 * data[k + 1]! + 0.11 * data[k + 2]!);
      lums.sort((a, b) => a - b);
      const lo = lums[Math.floor(lums.length * 0.02)] ?? 0;
      const hi = lums[Math.floor(lums.length * 0.98)] ?? 255;
      const out: Dot[] = [];
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const k = (j * cols + i) * 4;
          const a = data[k + 3]! / 255;
          if (a < 0.4) continue;
          const raw = 0.3 * data[k]! + 0.59 * data[k + 1]! + 0.11 * data[k + 2]!;
          const lum = Math.pow(Math.min(1, Math.max(0, (raw - lo) / Math.max(1, hi - lo))), 0.62);
          const x = px + i * step;
          const y = py + j * step;
          const dist = Math.hypot(x - face.x, (y - face.y) * 1.25) / reach;
          out.push({ x, y, l: Math.min(0.999, 0.16 + lum * 0.84), d: Math.max(0, 1 - dist * dist) });
        }
      }
      dots = out;
    };

    const resize = () => {
      const r = (pin.current ?? sec).getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = W * dpr;
      cv.height = H * dpr;
      cv.style.width = `${W}px`;
      cv.style.height = `${H}px`;
      buildGrid();
      buildDots();
      if (reduced) draw(0);
    };

    const BUCKETS = 6;
    const draw = (t: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#060820';
      ctx.fillRect(0, 0, cv.width, cv.height);
      if (grid) {
        ctx.globalAlpha = 0.9;
        ctx.drawImage(grid, 0, 0);
        ctx.globalAlpha = 1;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Black out the grid behind the head so the dots read as a solid bust.
      const p = pointer;
      const turn = p.x * 26;
      const nod = p.y * 10;
      const squeeze = 1 - Math.abs(p.x) * 0.05;
      const size = step * 0.78;
      const breathe = reduced ? 0 : Math.sin(t * 0.0012) * 1.2;
      ctx.fillStyle = '#060820';
      for (const d of dots) {
        const x = face.x + (d.x - face.x) * squeeze + turn * d.d;
        ctx.fillRect(x - 1, d.y + nod * d.d + breathe * d.d - 1, step + 1, step + 1);
      }
      for (let b = 0; b < BUCKETS; b++) {
        const lo = b / BUCKETS;
        const hi = (b + 1) / BUCKETS;
        const l = (lo + hi) / 2;
        ctx.fillStyle = `rgba(${Math.round(120 + l * 135)}, ${Math.round(105 + l * 145)}, 255, ${(0.35 + l * 0.65).toFixed(3)})`;
        ctx.beginPath();
        for (const d of dots) {
          if (d.l < lo || d.l >= hi) continue;
          const x = face.x + (d.x - face.x) * squeeze + turn * d.d;
          const s = size * (0.55 + d.l * 0.45);
          ctx.rect(x + (step - s) / 2, d.y + nod * d.d + breathe * d.d + (step - s) / 2, s, s);
        }
        ctx.fill();
      }
      if (reduced) return;
      // The glitch band: a strip that sweeps down, tearing the rows sideways.
      const period = 5200;
      const ph = (t % period) / period;
      const bandY = -80 + ph * (H + 160);
      const bandH = 46;
      const rnd = seeded(Math.floor(t / 60));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let y = Math.max(0, bandY); y < Math.min(H, bandY + bandH); y += 3) {
        const edge = 1 - Math.abs((y - bandY) / bandH - 0.5) * 2;
        const shift = (rnd() - 0.5) * 34 * edge;
        ctx.drawImage(cv, 0, y * dpr, cv.width, 3 * dpr, shift * dpr, y * dpr, cv.width, 3 * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = 'rgba(232, 226, 255, 0.85)';
      for (let n = 0; n < 26; n++) {
        const y = bandY + rnd() * bandH;
        ctx.fillRect(rnd() * W, y, 6 + rnd() * 26, 1);
      }
      // Stray sparks anywhere on the screen.
      if (rnd() < 0.5) ctx.fillRect(rnd() * W, rnd() * H, 8 + rnd() * 14, 1);
    };

    const tick = (t: number) => {
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      // Idle: a slow look around when the pointer is still.
      if (visible) draw(t);
      // Scroll bends the screen away (a curved tube tipping back).
      // While the hero is pinned, the screen tips back and shrinks onto the white.
      const r = sec.getBoundingClientRect();
      const s = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      const e = s * s * (3 - 2 * s);
      if (screen.current) {
        screen.current.style.transform = `perspective(1000px) translateY(${e * 6}vh) rotateX(${e * 32}deg) scale(${1 - e * 0.34})`;
        screen.current.style.borderRadius = `${Math.round(e * 160)}px / ${Math.round(e * 120)}px`;
      }
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const r = sec.getBoundingClientRect();
      if (e.clientY > r.bottom) return;
      pointer.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      pointer.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    };
    const onLeave = () => {
      pointer.tx = 0;
      pointer.ty = 0;
    };

    // Boot screen: the bar fills while the portrait loads (and for at least a moment).
    const t0 = performance.now();
    let bootRaf = 0;
    const boot = () => {
      const loaded = img.complete && img.naturalWidth > 0;
      const k = Math.min(1, (performance.now() - t0) / (reduced ? 1 : 1500));
      const v = loaded ? k : Math.min(0.85, k);
      setLoad(v);
      if (v >= 1) {
        window.setTimeout(() => setBooted(true), reduced ? 0 : 250);
        return;
      }
      bootRaf = requestAnimationFrame(boot);
    };
    bootRaf = requestAnimationFrame(boot);

    img.onload = () => {
      buildDots();
      if (reduced) draw(0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(pin.current ?? sec);
    resize();
    const io = new IntersectionObserver(([e]) => (visible = !!e?.isIntersecting));
    io.observe(sec);
    if (!reduced) raf = requestAnimationFrame(tick);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(bootRaf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <section id="home" ref={section} className="pf-sec hh" aria-labelledby="hh-name">
      <div ref={pin} className="hh-pin">
      <div ref={screen} className="hh-screen">
        <canvas ref={canvas} className="hh-canvas" role="img" aria-label={`${profile.name}, drawn as a glowing dot hologram`} />
        <span className="hh-scan" aria-hidden="true" />
        <span className="hh-vignette" aria-hidden="true" />

        <div className="hh-copy is-left">
          <h1 id="hh-name" className="hh-name">
            {profile.name}
          </h1>
          <p className="hh-meta">
            <span>// Portfolio</span>
            <span>{new Date().getFullYear()}</span>
          </p>
        </div>
        <p className="hh-copy is-right hh-tag">
          {profile.grade} at {profile.school}, {profile.schoolTown}. A student researcher exploring AI for cancer care and smarter investing.
        </p>
        <p className="hh-hint" aria-hidden="true">
          Scroll
        </p>
      </div>

      {!booted && (
        <div className={`hh-boot ${load >= 1 ? 'is-done' : ''}`} role="status" aria-label="Loading">
          <b>Loading</b>
          <span className="hh-bar">
            <i style={{ transform: `scaleX(${load})` }} />
          </span>
        </div>
      )}
      </div>
    </section>
  );
}
