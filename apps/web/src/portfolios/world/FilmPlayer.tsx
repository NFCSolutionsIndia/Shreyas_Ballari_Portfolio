import { useEffect, useRef, useState } from 'react';
import { drawFilm, type Film } from './films';

/** Plays one of the explainer films in a project sheet, with clickable steps and pause. */
export function FilmPlayer({ film }: { film: Film }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const forced = useRef({ scene: 0, start: 0 });
  const clock = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      if (playing && !reduced) clock.current += (now - last) / 1000;
      last = now;
      const c = canvas.current;
      const g = c?.getContext('2d');
      if (c && g) {
        // Reduced motion: hold each scene at its end state.
        const t = reduced ? forced.current.start + film.dur * 0.95 : clock.current;
        const k = drawFilm(film, g, t, c.width, c.height, forced.current);
        setScene((s) => (s === k ? s : k));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [film, playing]);

  const pick = (i: number) => {
    forced.current = { scene: i, start: clock.current };
    setScene(i);
  };

  return (
    <figure className="mw-film">
      <canvas ref={canvas} width={960} height={540} role="img" aria-label={`${film.title}. Step ${scene + 1}: ${film.scenes[scene]}`} />
      <figcaption>
        <button type="button" className="mw-film-play" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="mw-film-steps" role="tablist" aria-label="Steps">
          {film.scenes.map((s, i) => (
            <button key={s} type="button" role="tab" aria-selected={i === scene} className={i === scene ? 'is-on' : ''} onClick={() => pick(i)} title={s}>
              {i + 1}
            </button>
          ))}
        </div>
        <p>{film.scenes[scene]}</p>
      </figcaption>
    </figure>
  );
}
