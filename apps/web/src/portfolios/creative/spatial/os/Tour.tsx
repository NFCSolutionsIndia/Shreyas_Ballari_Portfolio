import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChatsCircle, Footprints, HandPointing, Info, Play, SpeakerHigh, SquaresFour, X } from '@phosphor-icons/react';
import { HOTSPOTS, hotspotEls, type Hotspot } from '../house/hotspots';
import { CHAPTERS } from '../story/chapters';
import { speak, stopSpeaking } from '../story/narrator';
import { TOUR } from '../story/tour';
import { playUi, spatial, useSpatial } from '../store';

/**
 * The house tour overlay. Left: the rooms (tap one to walk there). Right: a glass card that tells
 * the story of the room you are in, and changes into the details of anything you tap in the room
 * (the glowing points sit on real objects: certificates, the trophy, the hologram, the guitars…).
 * The room stays visible behind everything.
 *
 * On phones the card would cover the whole house, so it starts closed: a small bar names the
 * room, and the card opens only when the visitor taps a glowing point or "About this room".
 * Every card has a close button.
 */

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches;

export function RoomPoints({ station, open, onOpen }: { station: string | null; open: string | null; onOpen: (h: Hotspot) => void }) {
  const points = station ? HOTSPOTS.filter((h) => h.station === station) : HOTSPOTS;
  return (
    <div className="tour-points" aria-label="Things to explore in this room">
      {points.map((h, i) => (
        <button
          key={h.id}
          ref={(el) => {
            if (el) hotspotEls.set(h.id, el);
            else hotspotEls.delete(h.id);
          }}
          type="button"
          className={`tour-point ${open === h.id ? 'is-on' : ''}`}
          style={{ '--tint': h.tint ?? '#fff', '--i': i } as CSSProperties}
          aria-label={`${h.label}: show details`}
          data-voice={h.label}
          onClick={() => onOpen(h)}
        >
          <i aria-hidden="true" />
          <span>{h.label}</span>
        </button>
      ))}
    </div>
  );
}

/** What a point offers: ask the AI, watch the video, or open an app. */
export function goSpot(h: Hotspot) {
  if (h.ask) spatial.set({ bubble: true });
  else if (h.video) spatial.set({ video: true });
  else if (h.app) {
    if (spatial.get().walk) {
      spatial.endWalk();
      spatial.goChapter(h.app.id);
    } else spatial.endTour(h.app.id);
  }
}

export function SpotAction({ spot, onGo }: { spot: Hotspot; onGo: (h: Hotspot) => void }) {
  if (!spot.app && !spot.ask && !spot.video) return null;
  return (
    <button type="button" className="tour-go is-primary" onClick={() => onGo(spot)}>
      {spot.ask ? (
        <>
          <ChatsCircle weight="fill" aria-hidden="true" /> Ask the AI
        </>
      ) : spot.video ? (
        <>
          <Play weight="fill" aria-hidden="true" /> Watch in full view
        </>
      ) : (
        <>
          {spot.app!.label} <ArrowRight weight="bold" aria-hidden="true" />
        </>
      )}
    </button>
  );
}

export function Tour() {
  const at = useSpatial((s) => s.tourIndex);
  const target = useSpatial((s) => s.tourTarget);
  const narrate = useSpatial((s) => s.narrate);
  const [spot, setSpot] = useState<Hotspot | null>(null);
  /** The room's story card: open by default on larger screens, on request on phones. */
  const [info, setInfo] = useState(() => !isPhone());
  const stop = TOUR[at]!;
  const last = at === TOUR.length - 1;
  const app = stop.app ? CHAPTERS.find((c) => c.id === stop.app) : undefined;
  const count = HOTSPOTS.filter((h) => h.station === stop.station).length;

  // A new room closes any open details.
  useEffect(() => {
    setSpot(null);
    setInfo(!isPhone());
  }, [at]);
  useEffect(() => () => hotspotEls.clear(), []);

  // Read each room aloud as you arrive (only when the AI voice is on).
  useEffect(() => {
    if (!narrate) return;
    const t = window.setTimeout(() => speak(spot ? `${spot.title}. ${spot.text}` : `${stop.title}. ${stop.text}`), 600);
    return () => {
      window.clearTimeout(t);
      stopSpeaking();
    };
  }, [at, narrate, spot, stop.title, stop.text]);

  const openSpot = (h: Hotspot) => {
    playUi('open');
    setSpot((s) => (s?.id === h.id ? null : h));
  };
  const go = (h: Hotspot) => goSpot(h);

  return (
    <div className="tour">
      <header className="tour-top">
        <span className="tour-badge">House tour</span>
        <button type="button" className="tour-skip" data-voice="skip tour" onClick={() => spatial.endTour('home')}>
          Skip to dashboard <X weight="bold" aria-hidden="true" />
        </button>
        <button type="button" className="tour-skip" data-voice="walk freely" onClick={() => spatial.startWalk()}>
          <Footprints weight="fill" aria-hidden="true" /> Walk freely
        </button>
      </header>

      <RoomPoints station={stop.station} open={spot?.id ?? null} onOpen={openSpot} />

      {/* Rooms, on the left */}
      <nav className="tour-rooms" aria-label="Rooms">
        <button type="button" className="tour-arrow" aria-label="Previous room" disabled={at === 0} onClick={() => spatial.tourStep(-1, TOUR.length)}>
          <ArrowUp weight="bold" />
        </button>
        <ol>
          {TOUR.map((t, i) => (
            <li key={t.station}>
              <button type="button" className={i === at ? 'is-on' : i < at ? 'is-past' : ''} aria-current={i === at ? 'step' : undefined} data-voice={t.room} onClick={() => spatial.set({ tourTarget: i })}>
                <i aria-hidden="true" />
                <span>{t.room}</span>
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="tour-arrow" aria-label="Next room" disabled={last} onClick={() => spatial.tourStep(1, TOUR.length)}>
          <ArrowDown weight="bold" />
        </button>
      </nav>

      {/* The story card, on the right */}
      {spot ? (
        <article key={spot.id} className="tour-card is-detail" style={{ '--tint': spot.tint ?? '#fff' } as CSSProperties} aria-live="polite">
          <button type="button" className="os-round is-sm tour-close" aria-label="Close" data-voice="close" onClick={() => (setSpot(null), setInfo(false))}>
            <X weight="bold" />
          </button>
          <button type="button" className="tour-back" onClick={() => (setSpot(null), setInfo(true))}>
            <ArrowLeft weight="bold" aria-hidden="true" /> About this room
          </button>
          <span className="tour-n">{spot.kicker}</span>
          <h2>{spot.title}</h2>
          <div className="tour-body">
            <p>{spot.text}</p>
            {spot.items && (
              <ul className="tour-list">
                {spot.items.map((x, i) => (
                  <li key={x} style={{ '--i': i } as CSSProperties}>
                    {x}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <footer className="tour-actions">
            <button type="button" className="os-round" aria-label="Read this aloud" onClick={() => speak(`${spot.title}. ${spot.text}`)}>
              <SpeakerHigh weight="bold" />
            </button>
            <SpotAction spot={spot} onGo={go} />
          </footer>
        </article>
      ) : !info ? (
        <div className="tour-mini" role="status">
          <span>
            <b>{stop.room}</b>
            <small>{count > 0 ? `Tap the ${count} glowing point${count > 1 ? 's' : ''} to explore` : `${at + 1} of ${TOUR.length}`}</small>
          </span>
          <button type="button" className="tour-go" data-voice="about this room" onClick={() => setInfo(true)}>
            <Info weight="bold" aria-hidden="true" /> About
          </button>
        </div>
      ) : (
        <article key={at} className="tour-card" aria-live="polite">
          <button type="button" className="os-round is-sm tour-close" aria-label="Close" data-voice="close" onClick={() => setInfo(false)}>
            <X weight="bold" />
          </button>
          {stop.image && (
            <figure className="tour-img">
              <img src={stop.image} alt="" style={{ objectPosition: stop.focus ?? '50% 50%' }} />
              <figcaption>
                {String(at + 1).padStart(2, '0')} / {String(TOUR.length).padStart(2, '0')}
              </figcaption>
            </figure>
          )}
          <span className="tour-n">{stop.room}</span>
          <h2>{stop.title}</h2>
          <div className="tour-body">
            <p>{stop.text}</p>
            {stop.items && (
              <ul className="tour-items">
                {stop.items.map((x, i) => (
                  <li key={x} style={{ '--i': i } as CSSProperties}>
                    {x}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {count > 0 && (
            <p className="tour-explore">
              <HandPointing weight="fill" aria-hidden="true" /> Tap the {count} glowing point{count > 1 ? 's' : ''} in this room to explore
            </p>
          )}
          <footer className="tour-actions">
            <button type="button" className="os-round" aria-label="Read this room aloud" onClick={() => speak(`${stop.title}. ${stop.text}`)}>
              <SpeakerHigh weight="bold" />
            </button>
            {last ? (
              <button type="button" className="tour-go is-primary" data-voice="open dashboard" onClick={() => spatial.endTour('home')}>
                <SquaresFour weight="fill" aria-hidden="true" /> Open his dashboard
              </button>
            ) : (
              app && (
                <button type="button" className="tour-go" data-voice={`open ${app.title}`} onClick={() => spatial.endTour(app.id)}>
                  Open {app.title} <ArrowRight weight="bold" aria-hidden="true" />
                </button>
              )
            )}
          </footer>
        </article>
      )}

      <div className="tour-progress" aria-hidden="true">
        <i style={{ transform: `scaleX(${Math.min(1, target / (TOUR.length - 1))})` }} />
      </div>
      {at === 0 && (
        <p className="tour-hint">
          <span className="tour-mouse" aria-hidden="true" /> Scroll to walk room to room · drag to look around 360°
        </p>
      )}
    </div>
  );
}
