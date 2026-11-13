import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Brain, ChartLineUp, Code, Coffee, CurrencyCircleDollar, DeviceMobile, Dna, FileJs, FilePy, Flask, GraduationCap, Guitar, HandFist, HandPeace, Rocket, SwimmingPool, type Icon } from '@phosphor-icons/react';
import { flight } from './flight';
import { pressKey, releaseAll, releaseKey, tapKey } from './keyboard/controller';
import { ABOUT, buildSequence, plain, segments, type Segment } from './typing';

const Keyboard3D = lazy(() => import('./Keyboard3D'));

/**
 * About me, typed on a 3D keyboard. As the hero scrolls away the empty keyboard rises from the
 * bottom of the section, then its keycaps drop in one by one from under the hero and settle on
 * their switches (scroll drives this, so it reverses). Once the section is pinned the keyboard
 * types the introduction: every character appears as its key goes down (Shift for capitals), and
 * each animated icon pops in after the word it belongs to.
 */

/** Line icons dropped in after words (`{name}` in the text), each with a small idle motion. */
const ICONS: Record<string, { icon: Icon; motion: string; label: string }> = {
  peace: { icon: HandPeace, motion: 'wave', label: 'peace' },
  school: { icon: GraduationCap, motion: 'bob', label: 'school' },
  code: { icon: Code, motion: 'blink', label: 'code' },
  ai: { icon: Brain, motion: 'pulse', label: 'AI' },
  chart: { icon: ChartLineUp, motion: 'rise', label: 'business' },
  fintech: { icon: CurrencyCircleDollar, motion: 'spin', label: 'FinTech' },
  dna: { icon: Dna, motion: 'spin', label: 'oncology' },
  app: { icon: DeviceMobile, motion: 'bob', label: 'app' },
  js: { icon: FileJs, motion: 'tilt', label: 'JavaScript' },
  py: { icon: FilePy, motion: 'tilt', label: 'Python' },
  java: { icon: Coffee, motion: 'steam', label: 'Java' },
  swim: { icon: SwimmingPool, motion: 'wave', label: 'swimming' },
  fist: { icon: HandFist, motion: 'punch', label: 'Muay Thai' },
  guitar: { icon: Guitar, motion: 'strum', label: 'guitar' },
  lead: { icon: Rocket, motion: 'rise', label: 'leading' },
  lab: { icon: Flask, motion: 'pulse', label: 'research lab' },
};

/** His photo, set into the heading like a word. */
const PHOTO = `${import.meta.env.BASE_URL}assets/shreyas/portrait-studio.jpg`;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function canWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

interface Parts {
  typed: (HTMLSpanElement | null)[];
  rest: (HTMLSpanElement | null)[];
  icons: (HTMLSpanElement | null)[];
}

export function AboutKeys() {
  const lines = useMemo(() => [ABOUT.heading, ...ABOUT.paragraphs], []);
  const segs = useMemo(() => lines.map(segments), [lines]);
  const blocks = useMemo(() => lines.map(plain), [lines]);
  const seq = useMemo(() => buildSequence(blocks), [blocks]);
  const section = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const parts = useRef<Parts[]>(lines.map(() => ({ typed: [], rest: [], icons: [] })));
  const run = useRef({ token: 0, started: false, done: false, ready: false });
  const kick = useRef<() => void>(() => undefined);
  const [active, setActive] = useState(false);
  const [gl, setGl] = useState(false);
  const [done, setDone] = useState(false);

  /** Show the first n typed characters of a block (and every icon up to there). */
  const show = (block: number, n: number, typing = false) => {
    const p = parts.current[block]!;
    let t = 0;
    let k = 0;
    let caretSet = false;
    for (const s of segs[block]!) {
      if (s.kind === 'text') {
        const typed = p.typed[t];
        const rest = p.rest[t];
        const m = clamp(n - s.start, 0, s.text.length);
        if (typed) typed.textContent = s.text.slice(0, m);
        if (rest) rest.textContent = s.text.slice(m);
        // The caret sits at the end of the text being typed.
        const here = typing && !caretSet && m > 0 && n <= s.start + s.text.length;
        typed?.classList.toggle('is-typing', here || (typing && n === 0 && t === 0));
        if (here) caretSet = true;
        t++;
      } else {
        p.icons[k]?.classList.toggle('is-on', n > 0 && n >= s.at);
        k++;
      }
    }
  };
  const showAll = () => blocks.forEach((b, i) => show(i, b.length));
  const clearAll = () => blocks.forEach((_, i) => show(i, 0));

  const finish = () => {
    run.current.token++;
    run.current.done = true;
    releaseAll();
    showAll();
    setDone(true);
  };

  const type = async () => {
    const token = ++run.current.token;
    run.current.started = true;
    run.current.done = false;
    setDone(false);
    clearAll();
    show(0, 0, true);
    const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
    for (const s of seq) {
      await sleep(s.wait);
      if (token !== run.current.token) return;
      // Shift goes down first and comes up after the letter (a real capital).
      if (s.shift) {
        pressKey('ShiftLeft');
        await sleep(45);
        if (token !== run.current.token) return;
      }
      tapKey(s.key, 80 + Math.random() * 30);
      if (s.shift) window.setTimeout(() => releaseKey('ShiftLeft'), 130);
      if (s.ch === '\n') {
        show(s.block - 1, blocks[s.block - 1]!.length, false);
        show(s.block, 0, true);
      } else show(s.block, s.pos + 1, true);
    }
    if (token !== run.current.token) return;
    show(blocks.length - 1, blocks[blocks.length - 1]!.length, false);
    run.current.done = true;
    setDone(true);
  };

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const webgl = canWebGL();
    setGl(webgl);
    if (!reduced && webgl) {
      flight.rise = flight.want = flight.keys = 0;
      flight.sweepAt = -10;
    }
    if (reduced || !webgl) {
      showAll();
      run.current.started = run.current.done = true;
      setDone(true);
    } else clearAll();
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = section.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Entry: 0 when the section's top reaches the bottom of the screen, 1 when it is pinned.
      const e = reduced ? 1 : clamp((vh - r.top) / (vh * 0.97), 0, 1);
      // First the empty case rises, then the keys drop in.
      // The empty board settles in below the text; once the hero's edge nears the top of the
      // screen the keycaps rain down out from under it (played in the 3D scene, ~2.4 s).
      flight.rise = reduced ? 1 : ease(clamp((e - 0.5) / 0.4, 0, 1));
      if (reduced) flight.want = flight.keys = 1;
      else if (e > 0.8) flight.want = 1;
      else if (e < 0.55) flight.want = 0;
      // Room for the keyboard: below the text, above the tabs.
      const pin = el.querySelector('.pf-keys-pin');
      if (body.current && pin) {
        const pt = pin.getBoundingClientRect().top;
        flight.top = body.current.getBoundingClientRect().bottom - pt + 48;
      }
      flight.bottom = window.innerWidth < 760 ? 40 : 20;
      setActive(r.top < vh && r.bottom > 0);
      const s = run.current;
      if (!s.started && s.ready && !reduced && webgl && e >= 1 && flight.keys >= 1 && r.bottom > vh) void type();
      // Moving on before it has finished: finish the text rather than leave it half typed.
      if (s.started && !s.done && r.bottom < vh * 0.55) finish();
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    kick.current = onScroll;
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
      run.current.token++;
      releaseAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** A line rendered as typed/untyped text spans with icons between them. */
  const line = (b: number) => {
    let t = 0;
    let k = 0;
    const nodes = segs[b]!.map((s: Segment, i) => {
      if (s.kind === 'text') {
        const ti = t++;
        return (
          <span key={i}>
            <span ref={(n) => void (parts.current[b]!.typed[ti] = n)}>{s.text}</span>
            <span className="pf-keys-rest" ref={(n) => void (parts.current[b]!.rest[ti] = n)} />
          </span>
        );
      }
      const ki = k++;
      if (s.name === 'photo')
        return (
          <span key={i} ref={(n) => void (parts.current[b]!.icons[ki] = n)} className="pf-ico pf-ico-photo is-on">
            <img src={PHOTO} alt="" />
          </span>
        );
      const def = ICONS[s.name];
      if (!def) return null;
      const I = def.icon;
      return (
        <span key={i} ref={(n) => void (parts.current[b]!.icons[ki] = n)} className={`pf-ico m-${def.motion} is-on`} title={def.label}>
          <I weight="regular" aria-hidden="true" />
        </span>
      );
    });
    // Keep each icon on the same line as the punctuation that follows it.
    const out: ReactNode[] = [];
    segs[b]!.forEach((s, i) => {
      const next = segs[b]![i + 1];
      if (s.kind === 'icon' && next?.kind === 'text' && next.glue) {
        out.push(
          <span key={`g${i}`} className="pf-nowrap">
            {nodes[i]}
            {nodes[i + 1]}
          </span>,
        );
      } else if (!(s.kind === 'text' && s.glue && segs[b]![i - 1]?.kind === 'icon')) out.push(nodes[i]);
    });
    return out;
  };

  return (
    <section id="about" ref={section} className="pf-sec pf-keys" aria-labelledby="pf-about-h">
      <div className="pf-keys-pin">
        <h2 id="pf-about-h" className="pf-keys-h" aria-label={blocks[0]}>
          <span aria-hidden="true">{line(0)}</span>
        </h2>
        <div className="pf-keys-body" ref={body}>
          {ABOUT.paragraphs.map((_, i) => (
            <p key={i} aria-label={blocks[i + 1]}>
              <span aria-hidden="true">{line(i + 1)}</span>
            </p>
          ))}
        </div>
        {gl && (
          <div className="pf-keys-board" aria-hidden="true">
            <Suspense fallback={null}>
              <Keyboard3D
                active={active}
                onReady={() => {
                  run.current.ready = true;
                  kick.current();
                }}
              />
            </Suspense>
          </div>
        )}
        {done && gl && (
          <button type="button" className="pf-keys-again" onClick={() => void type()}>
            Type it again
          </button>
        )}
      </div>
    </section>
  );
}
