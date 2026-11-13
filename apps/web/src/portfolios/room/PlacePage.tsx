import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import type { Card, PlacePage as Page } from './places';

function CardView({ card, index }: { card: Card; index: number }) {
  const text = typeof card.text === 'string' ? card.text : card.text.text;
  const pending = card.pending || (typeof card.text !== 'string' && card.text.status === 'placeholder');
  const Icon = card.icon;
  const body = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden" style={{ backgroundColor: card.hue[0] }}>
        <img
          src={card.photo.src}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="room-card-blur absolute inset-0 h-full w-full scale-125 object-cover blur-xl"
        />
        <div className="room-card-media absolute inset-0">
          <img src={card.photo.src} alt={card.photo.alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
          <span className="absolute right-3 bottom-3 rounded-sm bg-white/80 px-2 py-0.5 text-[11px] text-black/60">
            Illustrative photo
          </span>
        </div>
        <span className="room-card-tag absolute top-3 left-3 rounded-sm bg-white px-2 py-0.5 text-[12px] font-medium">
          {card.href ? 'Open case' : 'Preview'}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="flex items-center gap-1.5 text-[11px] text-black/55">
          <Icon size={14} aria-hidden="true" className="text-black/70" />
          {card.meta}
        </p>
        <span
          aria-hidden="true"
          className={cn(
            'flex size-6 items-center justify-center rounded-sm border border-black/10 transition-colors duration-300',
            card.href ? 'group-hover:bg-black group-hover:text-white' : 'opacity-40',
          )}
        >
          <ArrowUpRight size={12} weight="bold" />
        </span>
      </div>
      <h3 className="mt-3 text-[22px] leading-tight font-medium tracking-[-0.02em]">{card.title}</h3>
      <p className={cn('mt-2 text-[13px] leading-relaxed', pending ? 'text-black/45' : 'text-black/60')}>
        {pending && (
          <span className="mr-2 inline-block rounded-sm border border-dashed border-black/30 px-1.5 text-[11px] text-black/55">
            To be supplied
          </span>
        )}
        {text}
      </p>
    </>
  );
  return (
    <li className="room-rise" style={{ '--i': index } as CSSProperties}>
      {card.href ? (
        <Link to={card.href} className="room-card group block">
          {body}
        </Link>
      ) : (
        <div className="room-card group">{body}</div>
      )}
    </li>
  );
}

/**
 * A place's page, opened from the room: the room fades into white behind a huge title with a
 * count badge, a short intro, filter chips and a grid of cards.
 */
export function PlacePage({ page, onBack }: { page: Page; onBack: () => void }) {
  const [filter, setFilter] = useState('All');
  const back = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    back.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onBack();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const cards = useMemo(
    () => (filter === 'All' ? page.cards : page.cards.filter((c) => c.meta.toLowerCase().includes(filter.toLowerCase().replace(/s$/, '')))),
    [filter, page.cards],
  );
  const count = (f: string) =>
    f === 'All' ? page.cards.length : page.cards.filter((c) => c.meta.toLowerCase().includes(f.toLowerCase().replace(/s$/, ''))).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-page-title"
      data-lenis-prevent
      className="room-page-in fixed inset-0 z-[60] overflow-y-auto bg-[linear-gradient(to_bottom,transparent_0,rgb(255_255_255/0.6)_30svh,#ffffff_52svh)]"
    >
      <div className="mx-auto max-w-7xl px-6 pt-[38svh] pb-24 md:px-12">
        <button
          ref={back}
          type="button"
          onClick={onBack}
          // Above the title: its tight line box overlaps the button.
          className="room-rise relative z-10 inline-flex min-h-11 items-center gap-2 text-[12px] font-medium"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Back to the room
        </button>
        <div className="mt-2 grid items-end gap-8 md:grid-cols-[1fr_minmax(0,22rem)]">
          <h2
            id="room-page-title"
            className="room-rise flex items-start gap-3 leading-[0.85] font-semibold tracking-[-0.055em]"
            style={{ fontSize: 'clamp(4rem, 13vw, 11rem)', '--i': 1 } as CSSProperties}
          >
            {page.title}
            <span className="mt-[0.12em] rounded-sm bg-black px-1.5 py-0.5 text-[12px] leading-none font-medium tracking-normal text-white">
              {String(page.cards.length).padStart(2, '0')}
            </span>
          </h2>
          <div className="room-rise pb-3" style={{ '--i': 2 } as CSSProperties}>
            <p className="text-[13px] leading-relaxed text-black/60">{page.intro}</p>
            {page.filters && (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Filter">
                {page.filters.map((f) => (
                  <li key={f}>
                    <button
                      type="button"
                      aria-pressed={filter === f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        'min-h-8 rounded-sm px-2 text-[12px] font-medium transition-colors duration-300',
                        filter === f ? 'bg-black text-white' : 'bg-black/5 hover:bg-black/10',
                      )}
                    >
                      {f} <span className="opacity-50">{String(count(f)).padStart(2, '0')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <ul className="mt-14 grid gap-x-4 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => (
            <CardView key={card.title} card={card} index={i + 3} />
          ))}
        </ul>
      </div>
    </div>
  );
}
