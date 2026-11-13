import { useEffect, useRef } from 'react';
import { ArrowsOut, X } from '@phosphor-icons/react';
import { oncure, profile } from '@/content/portfolio';
import { stopSpeaking } from '../story/narrator';
import { spatial, useSpatial } from '../store';

/**
 * His Oncure video in full view: a large glass player over the room (with sound, since it opens
 * from a tap), a button for the screen's own full screen, and Esc or the close button to go back.
 */
export function VideoOverlay() {
  const open = useSpatial((s) => s.video);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!open) return;
    stopSpeaking();
    const v = ref.current;
    v?.play().catch(() => {
      if (v) {
        v.muted = true;
        void v.play().catch(() => {});
      }
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        spatial.set({ video: false });
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);
  if (!open) return null;
  return (
    <div className="vo" role="dialog" aria-modal="true" aria-label="Oncure video" onClick={(e) => e.target === e.currentTarget && spatial.set({ video: false })}>
      <div className="vo-box">
        <header className="vo-head">
          <span>
            <b>Oncure</b>
            <small>A video by {profile.name} · {oncure.disclaimer}</small>
          </span>
          <button type="button" className="os-round" aria-label="Full screen" onClick={() => void ref.current?.requestFullscreen?.()}>
            <ArrowsOut weight="bold" />
          </button>
          <button type="button" className="os-round" aria-label="Close the video" data-voice="close video" onClick={() => spatial.set({ video: false })}>
            <X weight="bold" />
          </button>
        </header>
        <video ref={ref} src={oncure.video} controls playsInline preload="auto" />
      </div>
    </div>
  );
}
