import { useEffect, useRef, useState } from 'react';
import { Guitar, Pause, Play, SkipForward, Stop } from '@phosphor-icons/react';
import { createGuitar, TRACKS, type GuitarEngine, type GuitarState, type TrackId } from './guitar';
import { useReducedMotion } from './useReducedMotion';
import './fun.css';

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const voiceName = (title: string) => title.toLowerCase();

export function MusicPlayer() {
  const engineRef = useRef<GuitarEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<GuitarState>({ playing: false, paused: false, current: null });
  const [progress, setProgress] = useState({ position: 0, duration: TRACKS[0]?.duration ?? 0, fraction: 0 });
  const [selected, setSelected] = useState<TrackId>(TRACKS[0]?.id ?? 'morning-strings');
  const reduced = useReducedMotion();
  const stateRef = useRef(state);
  stateRef.current = state;

  const getEngine = () => {
    if (!engineRef.current) {
      const e = createGuitar();
      e.onChange((s) => {
        setState(s);
        if (s.current) setSelected(s.current);
      });
      e.onProgress(setProgress);
      engineRef.current = e;
    }
    return engineRef.current;
  };

  useEffect(
    () => () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    },
    [],
  );

  // Visualizer: frequency bars from the analyser, idle shimmer otherwise.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const BARS = 36;
    let data: Uint8Array<ArrayBuffer> | null = null;
    const levels = new Float32Array(BARS);
    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (reduced && now - last < 120) return;
      last = now;
      const analyser = engineRef.current?.analyser ?? null;
      const active = stateRef.current.playing && !stateRef.current.paused && analyser;
      if (active && analyser) {
        if (!data || data.length !== analyser.frequencyBinCount) data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
      }
      g.clearRect(0, 0, w, h);
      const gap = 3;
      const bw = Math.max(2, (w - gap * (BARS - 1)) / BARS);
      const grad = g.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, 'rgba(59, 91, 219, 0.95)');
      grad.addColorStop(1, 'rgba(120, 150, 255, 0.55)');
      g.fillStyle = grad;
      for (let i = 0; i < BARS; i++) {
        let target: number;
        if (active && data) {
          // Log-ish mapping of bins (~40 Hz – 6 kHz) to bars.
          const lo = Math.floor(2 * Math.pow(70, i / BARS));
          const hi = Math.max(lo + 1, Math.floor(2 * Math.pow(70, (i + 1) / BARS)));
          let sum = 0;
          for (let k = lo; k < hi; k++) sum += data[k] ?? 0;
          target = sum / (hi - lo) / 255;
        } else {
          target = reduced ? 0.06 : 0.05 + 0.03 * Math.sin(now / 700 + i * 0.5);
        }
        const prev = levels[i] ?? 0;
        const next = reduced ? target : prev + (target - prev) * (target > prev ? 0.5 : 0.12);
        levels[i] = next;
        const bh = Math.max(3, next * (h - 4));
        const x = i * (bw + gap);
        const r = Math.min(bw / 2, 4);
        g.beginPath();
        g.roundRect(x, h - bh, bw, bh, [r, r, 1, 1]);
        g.fill();
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reduced]);

  const current = TRACKS.find((t) => t.id === (state.current ?? selected)) ?? TRACKS[0];
  const isLive = state.playing && !state.paused;

  const onPlayPause = () => {
    const e = getEngine();
    if (!state.playing) void e.play(selected);
    else if (state.paused) void e.resume();
    else e.pause();
  };

  return (
    <section className="fun-card fun-player" aria-label="Generated guitar music player">
      <header className="fun-player__head">
        <span className="fun-player__icon" aria-hidden="true">
          <Guitar size={22} weight="duotone" />
        </span>
        <div>
          <p className="fun-eyebrow">Now playing</p>
          <h3 className="fun-title">{current?.title ?? 'Guitar'} <span className="fun-muted">(original, generated)</span></h3>
          <p className="fun-muted fun-small">{current?.style}</p>
        </div>
      </header>

      <canvas ref={canvasRef} className="fun-player__viz" aria-hidden="true" />

      <div className="fun-player__progress" aria-hidden="true">
        <div className="fun-player__bar" style={{ transform: `scaleX(${state.playing ? progress.fraction : 0})` }} />
      </div>
      <div className="fun-player__times fun-small fun-muted">
        <span>{formatTime(state.playing ? progress.position : 0)}</span>
        <span>{formatTime(current?.duration ?? 0)} loop</span>
      </div>

      <div className="fun-row">
        <button type="button" className="fun-btn fun-btn--primary" data-voice={isLive ? 'pause' : 'play'} onClick={onPlayPause}>
          {isLive ? <Pause size={18} weight="fill" aria-hidden="true" /> : <Play size={18} weight="fill" aria-hidden="true" />}
          {isLive ? 'Pause' : state.paused ? 'Resume' : 'Play'}
        </button>
        <button type="button" className="fun-btn" data-voice="next track" onClick={() => void getEngine().next()}>
          <SkipForward size={18} weight="bold" aria-hidden="true" />
          Next track
        </button>
        <button
          type="button"
          className="fun-btn"
          data-voice="stop music"
          onClick={() => engineRef.current?.stop()}
          disabled={!state.playing}
        >
          <Stop size={18} weight="bold" aria-hidden="true" />
          Stop
        </button>
      </div>

      <ol className="fun-tracks">
        {TRACKS.map((t, i) => {
          const isCurrent = state.playing && state.current === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                className={`fun-track${isCurrent ? ' is-current' : ''}`}
                data-voice={`play ${voiceName(t.title)}`}
                aria-pressed={isCurrent}
                onClick={() => {
                  setSelected(t.id);
                  void getEngine().play(t.id);
                }}
              >
                <span className="fun-track__num">{isCurrent && isLive ? '♪' : i + 1}</span>
                <span className="fun-track__text">
                  <span>
                    <strong>{t.title}</strong> <span className="fun-muted">(original, generated)</span>
                  </span>
                  <span className="fun-small fun-muted">{t.style}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="fun-note">
        Shreyas has played guitar since 2021 with Atlanta Piano Fortissimo. In his honour, these two
        original pieces are composed for this site and synthesised string by string in your browser. They are not recordings
        of him playing.
      </p>
    </section>
  );
}
