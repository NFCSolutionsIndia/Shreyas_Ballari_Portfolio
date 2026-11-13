import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  CaretLeft,
  CaretRight,
  Cursor,
  Moon,
  SpeakerHigh,
  SpeakerSlash,
  Sun,
} from '@phosphor-icons/react';
import { intro, profile } from '@/content/portfolio';
import { cn } from '@/lib/cn';
import { PLACES, type PlaceId } from './places';

interface HudProps {
  current: number;
  visible: boolean;
  lightsOn: boolean;
  soundOn: boolean;
  zoom: boolean;
  onStep: (delta: number) => void;
  onGoTo: (id: PlaceId) => void;
  onLook: (dir: -1 | 1) => void;
  onLights: () => void;
  onSound: () => void;
  onZoom: () => void;
}

const chip = 'flex size-8 items-center justify-center rounded-sm bg-white/85 backdrop-blur transition-colors duration-300 hover:bg-white';

/** The room's interface: logo, place stepper, toggles, intro text, key pad and room plan. */
export function Hud(props: HudProps) {
  const { current, visible, lightsOn, soundOn, zoom } = props;
  const place = PLACES[current] ?? PLACES[0]!;
  const PlaceIcon = place.icon;
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-30 transition-opacity duration-700 select-none',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      {/* Header */}
      <header className="pointer-events-auto absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-5 md:px-8">
        <a
          href="#top"
          className={cn(
            'flex min-h-9 items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] transition-colors duration-700',
            !lightsOn && 'text-white',
          )}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 16V3h12v13M7 16V8h4v8" />
          </svg>
          {profile.firstName}
        </a>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={props.onLights} className={chip} aria-pressed={!lightsOn} aria-label={lightsOn ? 'Dim the lights' : 'Turn the lights on'}>
            {lightsOn ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button type="button" onClick={props.onSound} className={chip} aria-pressed={soundOn} aria-label={soundOn ? 'Mute room sound' : 'Play room sound'}>
            {soundOn ? <SpeakerHigh size={15} /> : <SpeakerSlash size={15} />}
          </button>
          <Link
            to="/contact"
            className="ml-1 flex h-8 items-center gap-2 rounded-sm bg-black pr-1 pl-3 text-[12px] font-medium text-white"
          >
            Let’s talk
            <span className="flex size-6 items-center justify-center rounded-sm bg-white text-black">
              <ArrowUpRight size={12} weight="bold" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </header>

      {/* Place stepper */}
      <nav aria-label="Places" className="pointer-events-auto absolute top-16 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-1 rounded-sm bg-white/85 px-1 py-1 backdrop-blur">
          <button type="button" onClick={() => props.onStep(-1)} className="flex size-8 items-center justify-center" aria-label="Previous place">
            <CaretLeft size={14} />
          </button>
          <div className="w-36 text-center">
            <p aria-live="polite" className="flex items-center justify-center gap-1.5 text-[15px] leading-5 font-medium tracking-[-0.01em]">
              <PlaceIcon size={15} aria-hidden="true" />
              {place.name}
            </p>
            <div aria-hidden="true" className="mt-1 flex justify-center gap-1">
              {PLACES.map((p, i) => (
                <span key={p.id} className={cn('h-0.5 rounded-full transition-all duration-500', i === current ? 'w-4 bg-black' : 'w-1.5 bg-black/25')} />
              ))}
            </div>
          </div>
          <button type="button" onClick={() => props.onStep(1)} className="flex size-8 items-center justify-center" aria-label="Next place">
            <CaretRight size={14} />
          </button>
        </div>
      </nav>

      {/* Intro, bottom left */}
      <section
        aria-labelledby="room-title"
        className={cn(
          'absolute bottom-8 left-5 max-w-sm transition-[color,opacity] duration-700 md:left-8',
          lightsOn ? 'text-black' : 'text-white',
          // Shreyas tells the story at every other stop.
          place.id !== 'room' && 'opacity-0',
        )}
      >
        <h1 id="room-title" className="text-[2.5rem] leading-[0.95] font-semibold tracking-[-0.045em] md:text-[3.5rem]">
          Come in,
          <br />
          look around.
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed opacity-60">
          I’m {profile.name}, a student researcher at {profile.school}. {intro.headline} My research, projects and notes
          all live in this room.
        </p>
        <p className="mt-3 flex items-center gap-2 text-[11px] opacity-60">
          <Cursor size={12} aria-hidden="true" /> Scroll to walk, drag to look around
        </p>
      </section>

      {/* Key pad, bottom centre */}
      <div className="pointer-events-auto absolute bottom-6 left-1/2 hidden -translate-x-1/2 md:block" aria-label="Controls">
        <div className="grid grid-cols-[repeat(3,28px)_8px_28px] grid-rows-2 gap-1">
          <span />
          <button type="button" onClick={() => props.onStep(1)} className={cn(chip, 'size-7')} aria-label="Walk forward">
            <ArrowUp size={12} />
          </button>
          <span />
          <span />
          <span />
          <button type="button" onClick={() => props.onLook(1)} className={cn(chip, 'size-7')} aria-label="Look left">
            <ArrowLeft size={12} />
          </button>
          <button type="button" onClick={() => props.onStep(-1)} className={cn(chip, 'size-7')} aria-label="Walk back">
            <ArrowDown size={12} />
          </button>
          <button type="button" onClick={() => props.onLook(-1)} className={cn(chip, 'size-7')} aria-label="Look right">
            <ArrowRight size={12} />
          </button>
          <span />
          <button
            type="button"
            onClick={props.onZoom}
            aria-pressed={zoom}
            className={cn(chip, 'size-7 text-[11px] font-semibold', zoom && 'bg-black text-white hover:bg-black')}
            aria-label="Zoom"
          >
            Z
          </button>
        </div>
      </div>

      {/* Room plan, bottom right */}
      <aside aria-label="Room plan" className="pointer-events-auto absolute right-5 bottom-6 hidden w-56 rounded-sm bg-white/85 p-3 backdrop-blur md:block">
        <div className="flex items-baseline justify-between">
          <p className="text-[12px] font-medium">Room plan</p>
          <p className="text-[11px] text-black/50">{PLACES.length - 1} places</p>
        </div>
        <div className="mt-2 flex gap-3">
          <svg viewBox="-8 -9 16 20" className="h-28 w-20 shrink-0 border border-black/80 bg-[#f1ece4]" aria-hidden="true">
            <rect x="-0.7" y="7.9" width="1.4" height="0.3" fill="#111" />
            {PLACES.slice(1).map((p, i) => (
              <circle
                key={p.id}
                cx={p.plan[0]}
                cy={p.plan[1]}
                r={i + 1 === current ? 0.9 : 0.45}
                fill={i + 1 === current ? 'none' : '#111'}
                stroke="#111"
                strokeWidth={0.3}
              />
            ))}
          </svg>
          <ul className="flex flex-col gap-0.5">
            {PLACES.slice(1).map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => props.onGoTo(p.id)}
                  aria-current={i + 1 === current ? 'location' : undefined}
                  className={cn(
                    'flex items-center gap-1.5 text-[11px] leading-4 transition-colors',
                    i + 1 === current ? 'font-semibold text-black' : 'text-black/50 hover:text-black',
                  )}
                >
                  <p.icon size={12} aria-hidden="true" weight={i + 1 === current ? 'bold' : 'regular'} />
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
