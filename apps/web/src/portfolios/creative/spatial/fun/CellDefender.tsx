import { useEffect, useRef, useState } from 'react';
import { ArrowCounterClockwise, Crosshair, Play, Timer, Trophy } from '@phosphor-icons/react';
import { prefersReducedMotion } from './useReducedMotion';
import './fun.css';

/** Shown under the game. */
export const cellDefenderCaption =
  'A game inspired by Shreyas’s Oncure research concept (AI-guided nanobots that target tumour cells and spare healthy tissue). It is not a medical simulation.';

const ROUND_SECONDS = 45;
const BEST_KEY = 'fun-cell-defender-best';
const HIT_POINTS = 10;
const HEALTHY_PENALTY = 15;

type Phase = 'ready' | 'playing' | 'over';
type Kind = 'tumour' | 'healthy';

/* All positions are in dish units: the dish is a circle of radius 1 centred on (0, 0). */
interface Cell {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  seeds: number[];
  targeted: boolean;
  /** 0 = alive; counts up to 1 while being neutralised. */
  dying: number;
  /** Flash timer after a wrong click. */
  hurt: number;
  born: number;
}

interface Bot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  target: number;
  trail: { x: number; y: number }[];
  fade: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

interface World {
  cells: Cell[];
  bots: Bot[];
  particles: Particle[];
  popups: Popup[];
  ripples: { x: number; y: number; life: number }[];
  running: boolean;
  elapsed: number;
  score: number;
  combo: number;
  shake: number;
  flash: number;
  spawnTimer: number;
  nextId: number;
  time: number;
}

const newWorld = (): World => ({
  cells: [],
  bots: [],
  particles: [],
  popups: [],
  ripples: [],
  running: false,
  elapsed: 0,
  score: 0,
  combo: 0,
  shake: 0,
  flash: 0,
  spawnTimer: 0,
  nextId: 1,
  time: 0,
});

function readBest(): number {
  try {
    const v = Number(window.localStorage.getItem(BEST_KEY));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

function writeBest(v: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(v));
  } catch {
    /* storage unavailable */
  }
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function spawnCell(w: World, kind: Kind, speed: number): void {
  const r = kind === 'tumour' ? rnd(0.07, 0.095) : rnd(0.06, 0.08);
  // Find a spot that does not overlap existing cells.
  let x = 0;
  let y = 0;
  for (let tries = 0; tries < 20; tries++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * (0.9 - r);
    x = Math.cos(a) * d;
    y = Math.sin(a) * d;
    if (w.cells.every((c) => Math.hypot(c.x - x, c.y - y) > c.r + r + 0.03)) break;
  }
  const dir = Math.random() * Math.PI * 2;
  const v = speed * rnd(0.7, 1.2);
  w.cells.push({
    id: w.nextId++,
    kind,
    x,
    y,
    vx: Math.cos(dir) * v,
    vy: Math.sin(dir) * v,
    r,
    phase: Math.random() * Math.PI * 2,
    seeds: Array.from({ length: 9 }, () => Math.random() * Math.PI * 2),
    targeted: false,
    dying: 0,
    hurt: 0,
    born: w.time,
  });
}

function burst(w: World, x: number, y: number, colors: string[], count: number) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = rnd(0.15, 0.7);
    const max = rnd(0.45, 0.9);
    w.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: max,
      max,
      color: colors[i % colors.length] ?? '#ffffff',
      size: rnd(0.006, 0.016),
    });
  }
}

/** Closed smooth blob through n wobbling points. */
function blobPath(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, seeds: number[], t: number, amount: number) {
  const n = seeds.length;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const s = seeds[i] ?? 0;
    const rr = r * (1 + amount * Math.sin(s * 3 + t * 1.4) + amount * 0.6 * Math.sin(s + t * 0.7));
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const p = pts[i % n];
    const q = pts[(i + 1) % n];
    if (!p || !q) continue;
    const mx = (p[0] + q[0]) / 2;
    const my = (p[1] + q[1]) / 2;
    if (i === 0) g.moveTo(mx, my);
    else g.quadraticCurveTo(p[0], p[1], mx, my);
  }
  g.closePath();
}

export function CellDefender() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<World>(newWorld());
  const lastPointerRef = useRef(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);

  // Stable handle so the animation loop can end the round without stale closures.
  const endRoundRef = useRef<() => void>(() => undefined);
  endRoundRef.current = () => {
    const w = worldRef.current;
    w.running = false;
    const final = w.score;
    const prev = readBest();
    const isBest = final > prev;
    if (isBest) writeBest(final);
    setBest(Math.max(prev, final));
    setNewBest(isBest && final > 0);
    setScore(final);
    setTimeLeft(0);
    setPhase('over');
  };

  useEffect(() => {
    setBest(readBest());
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;

    let reduced = prefersReducedMotion();
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const onMq = () => {
      reduced = mq?.matches ?? false;
    };
    mq?.addEventListener('change', onMq);

    let W = 1;
    let H = 1;
    let R = 1;
    let cx = 0;
    let cy = 0;
    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.max(40, Math.min(W, H) / 2 - 10);
      cx = W / 2;
      cy = H / 2;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    let visible = true;
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
    });
    io.observe(stage);

    // Pointer → dish units.
    const toWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return { x: (clientX - rect.left - cx) / R, y: (clientY - rect.top - cy) / R };
    };

    const handleHit = (clientX: number, clientY: number) => {
      const w = worldRef.current;
      if (!w.running) return;
      const p = toWorld(clientX, clientY);
      const slop = 12 / R;
      let pick: Cell | null = null;
      let bestD = Infinity;
      for (const c of w.cells) {
        if (c.dying > 0) continue;
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        // Prefer tumour cells when two overlap.
        const rank = d - (c.kind === 'tumour' ? 0.02 : 0);
        if (d < c.r + slop && rank < bestD) {
          bestD = rank;
          pick = c;
        }
      }
      if (!pick) {
        w.ripples.push({ x: p.x, y: p.y, life: 0.5 });
        return;
      }
      if (pick.kind === 'tumour') {
        if (pick.targeted) return;
        pick.targeted = true;
        w.bots.push({ x: 0, y: 0.97, vx: 0, vy: -1.6, target: pick.id, trail: [], fade: 0 });
      } else {
        w.score -= HEALTHY_PENALTY;
        w.combo = 0;
        pick.hurt = 0.6;
        if (reduced) w.flash = 0.5;
        else w.shake = 0.35;
        w.popups.push({ x: pick.x, y: pick.y - pick.r, text: `−${HEALTHY_PENALTY}`, life: 1, color: '#3b5bdb' });
        setScore(w.score);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      lastPointerRef.current = performance.now();
      handleHit(e.clientX, e.clientY);
    };
    // A plain click (e.g. hand tracking's .click()) only counts if no pointerdown just handled it.
    const onClick = (e: MouseEvent) => {
      if (performance.now() - lastPointerRef.current < 500) return;
      const rect = canvas.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
      handleHit(e.clientX, e.clientY);
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('click', onClick);

    let shownSecond = ROUND_SECONDS;
    let raf = 0;
    let last = performance.now();

    const step = (dt: number) => {
      const w = worldRef.current;
      w.time += dt;
      const d = w.running ? Math.min(1, w.elapsed / ROUND_SECONDS) : 0;
      const motion = reduced ? 0.55 : 1;
      const speed = (0.06 + 0.12 * d) * motion;

      if (w.running) {
        w.elapsed += dt;
        const left = Math.max(0, Math.ceil(ROUND_SECONDS - w.elapsed));
        if (left !== shownSecond) {
          shownSecond = left;
          setTimeLeft(left);
        }
        if (w.elapsed >= ROUND_SECONDS) {
          endRoundRef.current();
        }
      }

      // Population
      const alive = w.cells.filter((c) => c.dying === 0);
      const tumours = alive.filter((c) => c.kind === 'tumour').length;
      const healthy = alive.length - tumours;
      const wantT = w.running ? 3 + Math.round(d * 5) : 3;
      const wantH = w.running ? 7 + Math.round(d * 2) : 6;
      w.spawnTimer -= dt;
      if (w.spawnTimer <= 0) {
        if (tumours < wantT) spawnCell(w, 'tumour', speed);
        else if (healthy < wantH) spawnCell(w, 'healthy', speed);
        w.spawnTimer = w.running ? 0.9 - 0.55 * d : 0.4;
      }

      // Cells
      for (const c of w.cells) {
        c.phase += dt;
        c.hurt = Math.max(0, c.hurt - dt);
        if (c.dying > 0) {
          c.dying += dt / 0.4;
          continue;
        }
        // Gentle wander, then steer speed back toward the target speed.
        c.vx += (Math.random() - 0.5) * 0.25 * dt * motion;
        c.vy += (Math.random() - 0.5) * 0.25 * dt * motion;
        const sp = Math.hypot(c.vx, c.vy) || 1e-6;
        const want = speed * (c.kind === 'tumour' ? 1.1 : 0.9);
        const k = 1 + (want / sp - 1) * Math.min(1, dt * 1.5);
        c.vx *= k;
        c.vy *= k;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (c.kind === 'tumour' && w.running) c.r = Math.min(0.12, c.r + dt * 0.002 * (1 + d));
        const dist = Math.hypot(c.x, c.y);
        const lim = 0.96 - c.r;
        if (dist > lim) {
          const nx = c.x / dist;
          const ny = c.y / dist;
          const dot = c.vx * nx + c.vy * ny;
          if (dot > 0) {
            c.vx -= 2 * dot * nx;
            c.vy -= 2 * dot * ny;
          }
          c.x = nx * lim;
          c.y = ny * lim;
        }
      }
      // Soft separation
      for (let i = 0; i < w.cells.length; i++) {
        const a = w.cells[i];
        if (!a || a.dying > 0) continue;
        for (let j = i + 1; j < w.cells.length; j++) {
          const b = w.cells[j];
          if (!b || b.dying > 0) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dd = Math.hypot(dx, dy) || 1e-6;
          const overlap = a.r + b.r + 0.01 - dd;
          if (overlap > 0) {
            const push = (overlap / 2) * Math.min(1, dt * 8);
            a.x -= (dx / dd) * push;
            a.y -= (dy / dd) * push;
            b.x += (dx / dd) * push;
            b.y += (dy / dd) * push;
          }
        }
      }
      w.cells = w.cells.filter((c) => c.dying < 1);

      // Nanobots home in on their target.
      for (const b of w.bots) {
        let target = w.cells.find((c) => c.id === b.target && c.dying === 0);
        if (!target) {
          const next = w.cells
            .filter((c) => c.kind === 'tumour' && c.dying === 0 && !c.targeted)
            .sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0];
          if (next && b.fade === 0) {
            next.targeted = true;
            b.target = next.id;
            target = next;
          } else {
            b.fade += dt * 2;
          }
        }
        if (target) {
          const dx = target.x - b.x;
          const dy = target.y - b.y;
          const dist = Math.hypot(dx, dy) || 1e-6;
          const max = 2.8;
          b.vx += ((dx / dist) * max - b.vx) * Math.min(1, dt * 9);
          b.vy += ((dy / dist) * max - b.vy) * Math.min(1, dt * 9);
          if (dist < target.r * 0.7) {
            target.dying = 0.001;
            w.combo += 1;
            const bonus = Math.min(w.combo - 1, 5) * 2;
            const gained = HIT_POINTS + bonus;
            w.score += gained;
            w.popups.push({ x: target.x, y: target.y - target.r, text: `+${gained}`, life: 1, color: '#c2304f' });
            burst(w, target.x, target.y, ['#ff6b8f', '#ffb3c6', '#7c9bff', '#ffffff'], reduced ? 10 : 26);
            setScore(w.score);
            b.fade = 0.001;
          }
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 16) b.trail.shift();
        if (b.fade > 0) b.fade += dt * 2.5;
      }
      w.bots = w.bots.filter((b) => b.fade < 1);

      for (const p of w.particles) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 1 - dt * 2.5;
        p.vy *= 1 - dt * 2.5;
      }
      w.particles = w.particles.filter((p) => p.life > 0);
      for (const p of w.popups) {
        p.life -= dt;
        p.y -= dt * 0.15;
      }
      w.popups = w.popups.filter((p) => p.life > 0);
      for (const r of w.ripples) r.life -= dt;
      w.ripples = w.ripples.filter((r) => r.life > 0);
      w.shake = Math.max(0, w.shake - dt);
      w.flash = Math.max(0, w.flash - dt);
    };

    const draw = () => {
      const w = worldRef.current;
      const t = w.time;
      g.clearRect(0, 0, W, H);
      g.save();
      if (w.shake > 0) {
        const s = w.shake * 22;
        g.translate(Math.sin(t * 70) * s, Math.cos(t * 55) * s * 0.4);
      }
      const X = (x: number) => cx + x * R;
      const Y = (y: number) => cy + y * R;

      // Petri dish
      const dish = g.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
      dish.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
      dish.addColorStop(0.7, 'rgba(236, 240, 248, 0.5)');
      dish.addColorStop(1, 'rgba(210, 220, 238, 0.55)');
      g.fillStyle = dish;
      g.beginPath();
      g.arc(cx, cy, R, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(27, 29, 34, 0.14)';
      g.stroke();
      g.lineWidth = 1;
      g.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      g.beginPath();
      g.arc(cx, cy, R - 5, Math.PI * 1.1, Math.PI * 1.65);
      g.stroke();

      // Nanobot port
      g.fillStyle = 'rgba(59, 91, 219, 0.18)';
      g.beginPath();
      g.arc(X(0), Y(0.97), 10, 0, Math.PI * 2);
      g.fill();

      g.save();
      g.beginPath();
      g.arc(cx, cy, R - 1, 0, Math.PI * 2);
      g.clip();

      const pulseAmt = reduced ? 0.015 : 0.06;
      // Healthy cells first, tumours on top.
      for (const kind of ['healthy', 'tumour'] as const) {
        for (const c of w.cells) {
          if (c.kind !== kind) continue;
          const fadeK = c.dying > 0 ? 1 - c.dying : Math.min(1, (t - c.born) / 0.5);
          if (fadeK <= 0) continue;
          const scale = c.dying > 0 ? 1 - c.dying * 0.6 : 0.6 + 0.4 * fadeK;
          const x = X(c.x);
          const y = Y(c.y);
          g.globalAlpha = Math.max(0, fadeK);
          if (kind === 'tumour') {
            const pulse = 1 + pulseAmt * Math.sin(c.phase * 4);
            const r = c.r * R * scale * pulse;
            const halo = g.createRadialGradient(x, y, r * 0.6, x, y, r * 1.7);
            halo.addColorStop(0, 'rgba(240, 90, 130, 0.28)');
            halo.addColorStop(1, 'rgba(240, 90, 130, 0)');
            g.fillStyle = halo;
            g.beginPath();
            g.arc(x, y, r * 1.7, 0, Math.PI * 2);
            g.fill();
            const body = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.15);
            body.addColorStop(0, '#ffd3de');
            body.addColorStop(0.5, '#f27a97');
            body.addColorStop(1, '#c2304f');
            g.fillStyle = body;
            blobPath(g, x, y, r, c.seeds, reduced ? 0 : c.phase, 0.13);
            g.fill();
            g.fillStyle = 'rgba(122, 20, 48, 0.55)';
            blobPath(g, x + r * 0.12, y + r * 0.08, r * 0.38, c.seeds, (reduced ? 0 : c.phase) + 2, 0.18);
            g.fill();
            if (c.targeted && c.dying === 0) {
              g.strokeStyle = 'rgba(59, 91, 219, 0.75)';
              g.lineWidth = 1.5;
              g.setLineDash([4, 5]);
              g.lineDashOffset = reduced ? 0 : -t * 30;
              g.beginPath();
              g.arc(x, y, r * 1.35, 0, Math.PI * 2);
              g.stroke();
              g.setLineDash([]);
            }
          } else {
            const r = c.r * R * scale;
            const body = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
            body.addColorStop(0, '#eef3ff');
            body.addColorStop(0.55, '#9db8ff');
            body.addColorStop(1, '#5a7ce6');
            g.fillStyle = body;
            g.beginPath();
            g.arc(x, y, r, 0, Math.PI * 2);
            g.fill();
            g.lineWidth = 1.5;
            g.strokeStyle = c.hurt > 0 ? `rgba(220, 60, 60, ${0.4 + c.hurt})` : 'rgba(59, 91, 219, 0.45)';
            g.stroke();
            g.fillStyle = 'rgba(40, 70, 190, 0.5)';
            g.beginPath();
            g.arc(x + r * 0.15, y + r * 0.1, r * 0.33, 0, Math.PI * 2);
            g.fill();
          }
        }
      }
      g.globalAlpha = 1;

      // Nanobots with glowing trails
      for (const b of w.bots) {
        const alpha = 1 - Math.min(1, b.fade);
        if (b.trail.length > 1) {
          for (let i = 1; i < b.trail.length; i++) {
            const p0 = b.trail[i - 1];
            const p1 = b.trail[i];
            if (!p0 || !p1) continue;
            const k = i / b.trail.length;
            g.strokeStyle = `rgba(80, 120, 255, ${0.5 * k * alpha})`;
            g.lineWidth = 1 + 4 * k;
            g.lineCap = 'round';
            g.beginPath();
            g.moveTo(X(p0.x), Y(p0.y));
            g.lineTo(X(p1.x), Y(p1.y));
            g.stroke();
          }
        }
        const x = X(b.x);
        const y = Y(b.y);
        const glow = g.createRadialGradient(x, y, 0, x, y, 16);
        glow.addColorStop(0, `rgba(120, 160, 255, ${0.9 * alpha})`);
        glow.addColorStop(1, 'rgba(120, 160, 255, 0)');
        g.fillStyle = glow;
        g.beginPath();
        g.arc(x, y, 16, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        g.beginPath();
        g.arc(x, y, 3.2, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = `rgba(59, 91, 219, ${alpha})`;
        g.lineWidth = 1.5;
        g.stroke();
      }

      for (const p of w.particles) {
        g.globalAlpha = Math.max(0, p.life / p.max);
        g.fillStyle = p.color;
        g.beginPath();
        g.arc(X(p.x), Y(p.y), Math.max(1, p.size * R), 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;

      for (const r of w.ripples) {
        g.strokeStyle = `rgba(27, 29, 34, ${r.life * 0.4})`;
        g.lineWidth = 1;
        g.beginPath();
        g.arc(X(r.x), Y(r.y), 6 + (0.5 - r.life) * 30, 0, Math.PI * 2);
        g.stroke();
      }
      g.restore();

      g.textAlign = 'center';
      g.font = "800 16px 'Manrope Variable', Manrope, system-ui, sans-serif";
      for (const p of w.popups) {
        g.globalAlpha = Math.min(1, p.life * 1.5);
        g.fillStyle = p.color;
        g.fillText(p.text, X(p.x), Y(p.y));
      }
      g.globalAlpha = 1;

      if (w.flash > 0) {
        g.strokeStyle = `rgba(220, 60, 60, ${w.flash})`;
        g.lineWidth = 6;
        g.beginPath();
        g.arc(cx, cy, R - 3, 0, Math.PI * 2);
        g.stroke();
      }
      g.restore();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;
      step(dt);
      draw();
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mq?.removeEventListener('change', onMq);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('click', onClick);
    };
  }, []);

  const start = () => {
    const w = newWorld();
    w.running = true;
    const startSpeed = prefersReducedMotion() ? 0.033 : 0.06;
    for (let i = 0; i < 3; i++) spawnCell(w, 'tumour', startSpeed);
    for (let i = 0; i < 7; i++) spawnCell(w, 'healthy', startSpeed);
    w.spawnTimer = 0.9;
    worldRef.current = w;
    setScore(0);
    setTimeLeft(ROUND_SECONDS);
    setNewBest(false);
    setPhase('playing');
  };

  const stop = () => {
    if (worldRef.current.running) endRoundRef.current();
  };

  return (
    <section className="fun-card fun-cd" aria-label="Cell Defender game">
      <header className="fun-cd__head">
        <div>
          <p className="fun-eyebrow">Game · inspired by Oncure</p>
          <h3 className="fun-title">Cell Defender</h3>
        </div>
        <div className="fun-cd__hud" aria-live="polite">
          <span className="fun-chip">
            <Crosshair size={16} weight="bold" aria-hidden="true" /> {score}
            <span className="fun-sr"> points</span>
          </span>
          <span className="fun-chip">
            <Timer size={16} weight="bold" aria-hidden="true" /> {phase === 'ready' ? ROUND_SECONDS : timeLeft}s
          </span>
          {phase === 'playing' && (
            <button type="button" className="fun-btn fun-btn--small" data-voice="end game" onClick={stop}>
              End round
            </button>
          )}
        </div>
      </header>

      <div ref={stageRef} className={`fun-cd__stage${phase === 'playing' ? ' is-playing' : ''}`}>
        <canvas
          ref={canvasRef}
          className="fun-cd__canvas"
          role="img"
          aria-label="Petri dish with drifting cells. Tap the pink, irregular tumour cells; avoid the smooth blue healthy cells."
        />
        {phase === 'ready' && (
          <div className="fun-cd__overlay">
            <p className="fun-cd__lead">
              Tap the <strong className="fun-pink">irregular pink tumour cells</strong> to send an AI-guided nanobot. Spare the{' '}
              <strong className="fun-blue">smooth blue healthy cells</strong>.
            </p>
            <button type="button" className="fun-btn fun-btn--primary" data-voice="start game" onClick={start}>
              <Play size={18} weight="fill" aria-hidden="true" /> Start game
            </button>
            <p className="fun-small fun-muted">{ROUND_SECONDS}-second round · +{HIT_POINTS} per tumour cell, combo bonus · −{HEALTHY_PENALTY} for a healthy cell</p>
          </div>
        )}
        {phase === 'over' && (
          <div className="fun-cd__overlay" role="status">
            <p className="fun-eyebrow">Round complete</p>
            <p className="fun-cd__score">{score}</p>
            <p className="fun-cd__best">
              <Trophy size={18} weight="duotone" aria-hidden="true" /> {newBest ? 'New best score!' : `Best: ${best}`}
            </p>
            <button type="button" className="fun-btn fun-btn--primary" data-voice="play again" onClick={start}>
              <ArrowCounterClockwise size={18} weight="bold" aria-hidden="true" /> Play again
            </button>
          </div>
        )}
      </div>

      <p className="fun-note">{cellDefenderCaption}</p>
    </section>
  );
}
