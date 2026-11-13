/**
 * The page-building engine for the Studio portfolio: a swarm of named agent cursors builds the
 * page live, block by block (after avivashishta.com/lab/agents-at-work).
 *
 * Every element marked `data-block` has one child `.fill` with all its visuals and goes through
 * four states: empty → mark (a cursor drags a dashed marquee over it) → rough (blue outline, grey
 * skeleton, a tooltip with the line of JSX it stands for) → done (the content lands).
 * Optional attributes on a block:
 *   data-agent  ask for a cursor by name        data-log    the line in the agent log
 *   data-code   the tooltip text                data-paint  fill with this colour in pixels
 *   data-type   (on the block or a child) type this text in with a caret
 *   data-count  (on a child) count the number up; data-count-from sets the start
 */

export interface Agent {
  name: string;
  color: string;
  /** Text colour on the name tag. */
  ink: string;
}

const INK = '#141414';
const RED = '#e5484d';
const BLUE = '#3a5bff';
const YELLOW = '#f5c518';

export const AGENTS: Agent[] = [
  { name: 'Claude', color: INK, ink: '#fff' },
  { name: 'Codex', color: RED, ink: '#fff' },
  { name: 'Layout', color: BLUE, ink: '#fff' },
  { name: 'Copy', color: YELLOW, ink: INK },
  { name: 'Pixel', color: BLUE, ink: '#fff' },
  { name: 'Motion', color: RED, ink: '#fff' },
  { name: 'Type', color: INK, ink: '#fff' },
  { name: 'Scout', color: YELLOW, ink: INK },
  { name: 'Oncure', color: INK, ink: '#fff' },
  { name: 'Markets', color: RED, ink: '#fff' },
  { name: 'Tutor', color: BLUE, ink: '#fff' },
  { name: 'Author', color: YELLOW, ink: INK },
];

export interface LogLine {
  id: number;
  time: string;
  agent: Agent;
  text: string;
}

export interface BuilderOptions {
  scrollToY: (y: number, opts?: { duration?: number; immediate?: boolean }) => void;
  onLog: (line: LogLine) => void;
  onProgress: (built: number, total: number) => void;
  onFinish: (ms: number) => void;
  /** Never hand over to the visitor's scroll (`?play`). */
  play: boolean;
}

class Cancelled extends Error {}

interface Tween {
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  t0: number;
  dur: number;
  bow: number;
  resolve: () => void;
  onUpdate?: (x: number, y: number) => void;
}

interface Cursor {
  agent: Agent;
  el: HTMLDivElement;
  x: number;
  y: number;
  tween: Tween | null;
  seed: number;
  /** On a job: holds still between moves instead of drifting back to its spot. */
  busy: boolean;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const ARROW =
  '<svg width="18" height="20" viewBox="0 0 18 20" aria-hidden="true"><path d="M2 1.5 16 10.2l-6.4 1.3-3.3 5.9z" fill="currentColor" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';

export class AgentBuilder {
  private gen = 0;
  private raf = 0;
  private last = 0;
  private layer: HTMLDivElement;
  private cursors: Cursor[];
  private sections: HTMLElement[];
  private blocks: HTMLElement[];
  private active = new Set<HTMLElement>();
  private visible = new Set<HTMLElement>();
  private visibleWaiters: (() => void)[] = [];
  private io: IntersectionObserver;
  private mode: 'auto' | 'observe' = 'auto';
  private play: boolean;
  /** Where idle cursors wait: a strip along the top of the section being built. */
  private flock = { x: 0, y: 0, w: 0 };
  private t0 = 0;
  private built = 0;
  private logId = 0;
  private narrow: boolean;
  private wheel: number[] = [];
  private touchY: number | null = null;
  private unlisten: () => void;

  constructor(
    private root: HTMLElement,
    private o: BuilderOptions,
  ) {
    this.play = o.play;
    this.narrow = window.matchMedia('(max-width: 700px)').matches;
    this.sections = [...root.querySelectorAll<HTMLElement>('[data-section]')];
    this.blocks = [...root.querySelectorAll<HTMLElement>('[data-block]')];

    this.layer = document.createElement('div');
    this.layer.className = 'agent-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    root.appendChild(this.layer);

    const w = root.clientWidth;
    this.cursors = AGENTS.map((agent, i) => {
      const el = document.createElement('div');
      el.className = 'agent-cursor';
      el.style.color = agent.color;
      el.innerHTML = `${ARROW}<span class="agent-tag" style="background:${agent.color};color:${agent.ink}">${agent.name}</span>`;
      this.layer.appendChild(el);
      // Start just off the top edge, spread across the page, and fly in.
      const c = { agent, el, x: (w * (i + 0.5)) / AGENTS.length, y: -60 - (i % 3) * 30, tween: null, seed: i * 1.7, busy: false };
      return c;
    });

    this.io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) this.visible.add(e.target as HTMLElement);
          else this.visible.delete(e.target as HTMLElement);
        }
        const waiters = this.visibleWaiters.splice(0);
        waiters.forEach((f) => f());
      },
      { threshold: 0.15 },
    );
    this.sections.forEach((s) => this.io.observe(s));

    // A deliberate scroll hands the camera to the visitor: two wheel notches within half a
    // second, a 60px touch drag or a scroll key. A brush of the trackpad doesn't count.
    const handover = () => {
      if (this.play || this.mode === 'observe') return;
      this.mode = 'observe';
      this.log(this.cursors[2]!.agent, 'handed the camera to you');
    };
    const onWheel = (e: WheelEvent) => {
      const now = performance.now();
      if (Math.abs(e.deltaY) < 4) return;
      this.wheel = [...this.wheel.filter((t) => now - t < 500), now];
      if (this.wheel.length >= 2) handover();
    };
    const onTouchStart = (e: TouchEvent) => (this.touchY = e.touches[0]?.clientY ?? null);
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (this.touchY !== null && y !== undefined && Math.abs(y - this.touchY) > 60) handover();
    };
    const onKey = (e: KeyboardEvent) => {
      if (['PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', ' ', 'Home', 'End'].includes(e.key)) handover();
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKey);
    this.unlisten = () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKey);
    };

    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  get total() {
    return this.blocks.length;
  }

  // --- Public controls --------------------------------------------------------------------------

  start() {
    const gen = ++this.gen;
    this.t0 = performance.now();
    this.built = this.blocks.filter((b) => b.dataset.state === 'done').length;
    this.o.onProgress(this.built, this.total);
    void this.run(gen);
  }

  /** Finish everything at once. */
  skip() {
    this.gen++;
    this.clearWork();
    for (const b of this.blocks) this.finish(b, true);
    this.built = this.total;
    this.o.onProgress(this.built, this.total);
    this.log(this.cursors[0]!.agent, 'skipped ahead and finished every block');
    this.o.onFinish(performance.now() - this.t0);
  }

  /** Pull the page apart from the bottom up, go back to the top and build it all again. */
  async rebuild() {
    const gen = ++this.gen;
    this.clearWork();
    this.play = true; // asking to watch it again means watching all of it
    this.mode = 'auto';
    const done = [...this.blocks].reverse();
    for (let i = 0; i < done.length; i++) {
      const b = done[i]!;
      b.dataset.state = 'rough';
      window.setTimeout(() => {
        if (gen === this.gen) delete b.dataset.state;
      }, 120);
      if (i % 3 === 0) await this.sleep(16, gen).catch(() => undefined);
      if (gen !== this.gen) return;
    }
    this.o.scrollToY(0, { duration: 1.1 });
    await this.sleep(700, gen).catch(() => undefined);
    if (gen !== this.gen) return;
    this.start();
  }

  destroy() {
    this.gen++;
    cancelAnimationFrame(this.raf);
    this.io.disconnect();
    this.unlisten();
    this.clearWork();
    this.layer.remove();
  }

  // --- The show ----------------------------------------------------------------------------------

  private async run(gen: number) {
    try {
      for (let i = 0; i < this.sections.length; i++) {
        if (this.mode === 'observe') break;
        const s = this.sections[i]!;
        await this.buildSection(s, gen);
        const next = this.sections[i + 1];
        // No dead air: head for the next section while the cursors are still finishing up.
        if (next && this.mode === 'auto') this.o.scrollToY(this.absTop(next) - 90, { duration: 1.0 });
      }
      // Handed over: only sections on screen get built; skipped ones wait until they're seen.
      while (this.sections.some((s) => !this.sectionDone(s))) {
        this.check(gen);
        const s = this.sections.find((x) => !this.sectionDone(x) && this.visible.has(x));
        if (s) await this.buildSection(s, gen);
        else await new Promise<void>((res) => this.visibleWaiters.push(res));
      }
      this.check(gen);
      this.log(this.cursors[0]!.agent, 'handed it over to Shreyas');
      this.o.onFinish(performance.now() - this.t0);
    } catch (e) {
      if (!(e instanceof Cancelled)) throw e;
    }
  }

  private sectionDone(s: HTMLElement) {
    return [...s.querySelectorAll<HTMLElement>('[data-block]')].every((b) => b.dataset.state === 'done');
  }

  private async buildSection(section: HTMLElement, gen: number) {
    const blocks = [...section.querySelectorAll<HTMLElement>('[data-block]')].filter((b) => b.dataset.state !== 'done');
    if (!blocks.length) return;
    const r = this.rectOf(section);
    this.flock = { x: r.x + 24, y: r.y + clamp(r.h * 0.12, 28, 96), w: Math.max(240, r.w - 48) };

    // A crew of up to five (two on phones): anyone asked for by name, then the next in line.
    const size = this.narrow ? 2 : 5;
    const asked = [...new Set(blocks.map((b) => b.dataset.agent).filter(Boolean))] as string[];
    const offset = this.sections.indexOf(section) * 3;
    const rotation = [...this.cursors.slice(offset % 12), ...this.cursors.slice(0, offset % 12)];
    const crew: Cursor[] = asked.map((n) => this.cursors.find((c) => c.agent.name === n)!).filter(Boolean);
    for (const c of rotation) if (crew.length < Math.max(size, asked.length) && !crew.includes(c)) crew.push(c);

    const queues = new Map<Cursor, HTMLElement[]>(crew.map((c) => [c, []]));
    let rr = 0;
    for (const b of blocks) {
      const named = crew.find((c) => c.agent.name === b.dataset.agent);
      if (named) queues.get(named)!.push(b);
      else {
        // Round robin over the crew, lightest queue first.
        const free = [...queues.entries()].sort((a, z) => a[1].length - z[1].length || 0);
        const pick = free[rr++ % Math.min(free.length, size)]![0];
        queues.get(pick)!.push(b);
      }
    }
    await Promise.all([...queues.entries()].map(async ([c, q]) => {
      for (const b of q) await this.job(c, b, gen);
    }));
  }

  private async job(c: Cursor, b: HTMLElement, gen: number) {
    this.check(gen);
    c.busy = true;
    try {
      await this.work(c, b, gen);
    } finally {
      c.busy = false;
    }
  }

  private async work(c: Cursor, b: HTMLElement, gen: number) {
    const r = this.rectOf(b);
    await this.move(c, r.x - 2, r.y - 2, gen);

    // Mark: drag a dashed marquee from top left to bottom right.
    b.dataset.state = 'mark';
    this.active.add(b);
    this.follow();
    const m = this.marquee(r.x, r.y);
    await this.move(c, r.x + r.w, r.y + r.h, gen, {
      dur: clamp(160 + (r.w + r.h) * 0.1, 200, 420),
      bow: 0,
      onUpdate: (x, y) => m.size(x - r.x, y - r.y),
    });
    m.el.remove();

    // Rough: outline, skeleton and the line of JSX it stands for.
    b.dataset.state = 'rough';
    const tip = this.tooltip(b, r);
    await this.move(c, r.x + r.w * 0.55, r.y + r.h * 0.5, gen, { dur: 170 });
    await this.sleep(90, gen);
    tip.remove();

    // Done.
    const typeEl = b.matches('[data-type]') ? b : b.querySelector<HTMLElement>('[data-type]');
    if (typeEl) await this.type(c, b, typeEl, gen);
    else if (b.dataset.paint) await this.paint(b, b.dataset.paint, gen);
    this.finish(b);
    this.active.delete(b);
    this.follow();
    this.built++;
    this.o.onProgress(this.built, this.total);
    this.log(c.agent, b.dataset.log ?? 'built a block');
  }

  /** Land a block: content in, flash, numbers count up. */
  private finish(b: HTMLElement, instant = false) {
    b.querySelectorAll('.agent-typing, .agent-pixels').forEach((n) => n.remove());
    b.querySelectorAll<HTMLElement>('[data-typing]').forEach((n) => delete n.dataset.typing);
    const was = b.dataset.state;
    b.dataset.state = 'done';
    if (instant || was === 'done') return;
    b.dataset.flash = '';
    window.setTimeout(() => delete b.dataset.flash, 800);
    b.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => this.count(el));
  }

  private count(el: HTMLElement) {
    const final = el.dataset.countTo ?? el.textContent ?? '';
    el.dataset.countTo = final;
    const m = final.match(/^(\D*)(\d+)(.*)$/);
    if (!m) return;
    const [, pre, num, post] = m;
    const to = Number(num);
    const from = Number(el.dataset.countFrom ?? 0);
    const t0 = performance.now();
    const step = () => {
      const t = clamp((performance.now() - t0) / 900, 0, 1);
      const v = Math.round(from + (to - from) * (1 - (1 - t) ** 3));
      el.textContent = `${pre}${v}${post}`;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** Type the headline into an overlay over the transparent full text, so nothing reflows. */
  private async type(c: Cursor, block: HTMLElement, el: HTMLElement, gen: number) {
    const text = el.textContent ?? '';
    block.dataset.state = 'done';
    block.dataset.noland = '';
    el.dataset.typing = '';
    const overlay = document.createElement('span');
    overlay.className = 'agent-typing';
    const typed = document.createElement('span');
    const caret = document.createElement('span');
    caret.className = 'agent-caret';
    caret.style.background = c.agent.color;
    overlay.append(typed, caret);
    el.appendChild(overlay);
    const per = clamp(650 / Math.max(1, text.length), 12, 30);
    for (let i = 1; i <= text.length; i++) {
      this.check(gen);
      typed.textContent = text.slice(0, i);
      if (i % 4 === 0 || i === text.length) {
        const cr = caret.getBoundingClientRect();
        const rr = this.root.getBoundingClientRect();
        this.settle(c);
        void this.move(c, cr.right - rr.left + 4, cr.bottom - rr.top - cr.height * 0.3, gen, { dur: 110, bow: 0 }).catch(() => undefined);
      }
      await this.sleep(per, gen);
    }
    overlay.remove();
    delete el.dataset.typing;
    delete block.dataset.noland;
  }

  /** Fill the block with its colour in pixels, bottom rows first, then let the content land. */
  private async paint(b: HTMLElement, color: string, gen: number) {
    const grid = document.createElement('div');
    grid.className = 'agent-pixels';
    const cell = 22;
    const cols = Math.max(4, Math.round(b.clientWidth / cell));
    const rows = Math.max(3, Math.round(b.clientHeight / cell));
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    const frag = document.createDocumentFragment();
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < cols; k++) {
        const s = document.createElement('span');
        s.style.background = color;
        s.style.transitionDelay = `${(rows - 1 - r) * 24 + Math.random() * 80}ms`;
        frag.appendChild(s);
      }
    }
    grid.appendChild(frag);
    b.appendChild(grid);
    void grid.offsetWidth;
    grid.dataset.on = '';
    await this.sleep(rows * 20 + 150, gen);
    window.setTimeout(() => {
      grid.dataset.off = '';
      window.setTimeout(() => grid.remove(), 450);
    }, 330);
    // finish() would remove the pixels at once; keep them for the fade.
    grid.classList.replace('agent-pixels', 'agent-pixels-fading');
  }

  // --- Cursors -----------------------------------------------------------------------------------

  private move(c: Cursor, tx: number, ty: number, gen: number, opt: { dur?: number; bow?: number; onUpdate?: (x: number, y: number) => void } = {}) {
    this.check(gen);
    const dist = Math.hypot(tx - c.x, ty - c.y);
    const dur = opt.dur ?? clamp(120 + dist * 0.26, 160, 520);
    const bow = opt.bow ?? dist * 0.06 * (Math.random() < 0.5 ? -1 : 1);
    return new Promise<void>((resolve, reject) => {
      const g = gen;
      c.tween = {
        fx: c.x,
        fy: c.y,
        tx,
        ty,
        t0: performance.now(),
        dur,
        bow,
        onUpdate: opt.onUpdate,
        resolve: () => (g === this.gen ? resolve() : reject(new Cancelled())),
      };
    });
  }

  private tick = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    for (let i = 0; i < this.cursors.length; i++) {
      const c = this.cursors[i]!;
      const tw = c.tween;
      if (tw) {
        const t = clamp((now - tw.t0) / tw.dur, 0, 1);
        const e = ease(t);
        const dx = tw.tx - tw.fx;
        const dy = tw.ty - tw.fy;
        const len = Math.hypot(dx, dy) || 1;
        const b = Math.sin(Math.PI * e) * tw.bow;
        c.x = tw.fx + dx * e - (dy / len) * b;
        c.y = tw.fy + dy * e + (dx / len) * b;
        tw.onUpdate?.(c.x, c.y);
        if (t >= 1) {
          c.tween = null;
          tw.resolve();
        }
      } else if (!c.busy) {
        // Idle: each cursor has its own spot along the top of the section (never stacked on
        // another one), and sways gently there.
        const cols = this.narrow ? 4 : this.cursors.length;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const a = now / 1400 + c.seed;
        const tx = this.flock.x + (this.flock.w * (col + 0.5)) / cols + Math.cos(a) * 9;
        const ty = this.flock.y + row * 38 + (col % 2) * 30 + Math.sin(a * 0.8) * 6;
        c.x += (tx - c.x) * Math.min(1, dt * 2.2);
        c.y += (ty - c.y) * Math.min(1, dt * 2.2);
      }
      // Busy cursors that are close keep their name tags apart.
      for (let j = 0; j < i; j++) {
        const o = this.cursors[j]!;
        const dx = c.x - o.x;
        const dy = c.y - o.y;
        if (Math.abs(dx) < 84 && Math.abs(dy) < 26 && !c.tween) {
          c.y += (dy >= 0 ? 1 : -1) * Math.min(26 - Math.abs(dy), 120 * dt);
        }
      }
      c.el.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  // --- Helpers -----------------------------------------------------------------------------------

  private marquee(x: number, y: number) {
    const el = document.createElement('div');
    el.className = 'agent-marquee';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    const label = document.createElement('span');
    label.className = 'agent-size';
    el.appendChild(label);
    this.layer.appendChild(el);
    return {
      el,
      size: (w: number, h: number) => {
        el.style.width = `${Math.max(0, w)}px`;
        el.style.height = `${Math.max(0, h)}px`;
        label.textContent = `${Math.round(Math.max(0, w))} x ${Math.round(Math.max(0, h))}`;
      },
    };
  }

  private tooltip(b: HTMLElement, r: Rect) {
    const tip = document.createElement('div');
    tip.className = 'agent-code';
    tip.textContent = b.dataset.code ?? '<Block />';
    tip.style.left = `${r.x}px`;
    tip.style.top = `${r.y - 10}px`;
    this.layer.appendChild(tip);
    return tip;
  }

  private log(agent: Agent, text: string) {
    const s = (performance.now() - this.t0) / 1000;
    const time = `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`;
    this.o.onLog({ id: ++this.logId, time, agent, text });
  }

  /** Keep every block being worked on in view: low enough for the lowest, never past the highest. */
  private follow() {
    if (this.mode !== 'auto' || !this.active.size) return;
    let top = Infinity;
    let bottom = -Infinity;
    for (const b of this.active) {
      top = Math.min(top, this.absTop(b));
      bottom = Math.max(bottom, this.absTop(b) + b.offsetHeight);
    }
    const vh = window.innerHeight;
    const y = window.scrollY;
    const lower = bottom + 60 - vh;
    const upper = top - 90;
    const want = lower <= upper ? clamp(y, lower, upper) : upper;
    if (Math.abs(want - y) > 24) this.o.scrollToY(Math.max(0, want), { duration: 0.9 });
  }

  private absTop(el: HTMLElement) {
    return el.getBoundingClientRect().top + window.scrollY;
  }

  private rectOf(el: HTMLElement): Rect {
    const r = el.getBoundingClientRect();
    const root = this.root.getBoundingClientRect();
    return { x: r.left - root.left, y: r.top - root.top, w: r.width, h: r.height };
  }

  private clearWork() {
    this.layer.querySelectorAll('.agent-marquee, .agent-code').forEach((n) => n.remove());
    this.active.clear();
    for (const c of this.cursors) this.settle(c);
    const waiters = this.visibleWaiters.splice(0);
    waiters.forEach((f) => f());
  }

  /** End a cursor's current flight now (its job carries on, or stops if it was cancelled). */
  private settle(c: Cursor) {
    const tw = c.tween;
    c.tween = null;
    tw?.resolve();
  }

  private check(gen: number) {
    if (gen !== this.gen) throw new Cancelled();
  }

  private sleep(ms: number, gen: number) {
    return new Promise<void>((resolve, reject) =>
      window.setTimeout(() => (gen === this.gen ? resolve() : reject(new Cancelled())), ms),
    );
  }
}
