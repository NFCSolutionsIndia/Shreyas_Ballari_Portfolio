import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * A Liquid Glass window floating in the room: frosted, translucent, with an edge highlight and
 * soft depth. It opens by moving gently forward out of the room and closes by sinking back.
 * Below it sits a grab bar (as in spatial operating systems): drag it with a mouse, finger or a
 * pinch (hand mode sends the same pointer events) to move the window.
 */
export function GlassWindow({ id, className, style, title, children, onClose, tilt = 0 }: { id: string; className?: string; style?: CSSProperties; title?: string; children: ReactNode; onClose?: () => void; tilt?: number }) {
  const [shown, setShown] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 30);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <section
      className={`sp-window ${shown ? 'is-shown' : ''} ${className ?? ''}`}
      style={{ ...style, '--dx': `${pos.x}px`, '--dy': `${pos.y}px`, '--tilt': `${tilt}deg` } as CSSProperties}
      aria-label={title}
      data-window={id}
    >
      <div className="sp-window-glass">
        {onClose && (
          <button type="button" className="sp-window-close" aria-label="Close window" onClick={onClose}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
        {children}
      </div>
      <div
        className="sp-window-bar"
        role="slider"
        aria-label="Move window"
        aria-valuetext="Drag to move"
        aria-valuenow={0}
        tabIndex={0}
        data-drag=""
        onPointerDown={(e) => {
          try {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          } catch {
            /* hand mode sends synthetic pointers that cannot be captured */
          }
          drag.current = { x: pos.x, y: pos.y, px: e.clientX, py: e.clientY };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          setPos({ x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py });
        }}
        onPointerUp={() => (drag.current = null)}
        onKeyDown={(e) => {
          const step = 24;
          if (e.key === 'ArrowLeft') setPos((p) => ({ ...p, x: p.x - step }));
          if (e.key === 'ArrowRight') setPos((p) => ({ ...p, x: p.x + step }));
          if (e.key === 'ArrowUp') setPos((p) => ({ ...p, y: p.y - step }));
          if (e.key === 'ArrowDown') setPos((p) => ({ ...p, y: p.y + step }));
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.stopPropagation();
        }}
      />
    </section>
  );
}
