import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Experience } from '@/content/experience';
import './motion.css';

/**
 * The media for an activity. With a video it plays it straight away: muted, looping, inline, the
 * portrait version on phones, paused while off screen, with a play/pause button and progress.
 * Without one it shows the related picture.
 */

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches;

function Clip({ item, controls, label }: { item: Experience; controls: boolean; label: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [frac, setFrac] = useState(0);
  const src = item.videoMobile && isPhone() ? item.videoMobile : item.video!;
  // Lazy: don't download anything until the clip is about to scroll into view.
  const [near, setNear] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v || near) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setNear(true), { rootMargin: '300px' });
    io.observe(v);
    return () => io.disconnect();
  }, [near]);
  // Only play while on screen (and not paused by the visitor).
  useEffect(() => {
    const v = ref.current;
    if (!v || !near) return;
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting && !paused) void v.play().catch(() => undefined);
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, [paused, src, near]);
  return (
    <>
      <video
        ref={ref}
        key={src}
        src={near ? src : undefined}
        muted
        loop
        playsInline
        preload={near ? 'metadata' : 'none'}
        aria-label={`${item.title}: ${item.videoNote ?? 'video'}`}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration) setFrac(v.currentTime / v.duration);
        }}
      />
      <span className="xm-shade" aria-hidden="true" />
      {label && (
        <figcaption className="xm-badge is-video">
          <i aria-hidden="true" /> {item.videoNote ?? 'Video'}
        </figcaption>
      )}
      {controls && (
        <div className="xm-bar">
          <button
            type="button"
            className="xm-play"
            aria-label={paused ? 'Play the video' : 'Pause the video'}
            data-voice={paused ? 'play' : 'pause'}
            onClick={(e) => {
              e.stopPropagation();
              const v = ref.current;
              if (!v) return;
              if (paused) void v.play().catch(() => undefined);
              else v.pause();
              setPaused(!paused);
            }}
          >
            <PlayIcon paused={paused} />
          </button>
          <span className="xm-progress is-live">
            <i style={{ transform: `scaleX(${frac})` }} />
          </span>
        </div>
      )}
    </>
  );
}

function PlayIcon({ paused }: { paused: boolean }) {
  return paused ? (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor" />
    </svg>
  );
}

export function MotionMedia({ item, className = '', controls = true, label = true }: { item: Experience; className?: string; controls?: boolean; label?: boolean }) {
  if (item.video)
    return (
      <figure className={`xm is-video ${className}`} style={{ '--tint': item.tint } as CSSProperties}>
        <Clip item={item} controls={controls} label={label} />
      </figure>
    );
  // No video yet: just the related picture.
  return (
    <figure className={`xm is-still ${className}`} style={{ '--tint': item.tint } as CSSProperties}>
      <img className="xm-img" src={item.image} alt="" loading="lazy" draggable={false} onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} />
      {label && <figcaption className="xm-badge is-still">{item.imageNote}</figcaption>}
    </figure>
  );
}
