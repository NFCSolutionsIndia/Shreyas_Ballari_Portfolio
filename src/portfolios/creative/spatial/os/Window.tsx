import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { CaretLeft, X } from '@phosphor-icons/react';

/**
 * A spatial window: frosted glass (dark or light), floating in the room. It swings forward out
 * of the room as it opens, can be moved by the grab bar under it (mouse, touch or a pinch), has a
 * close button, and an optional back button for sub-views.
 */
export function OSWindow({
  id,
  variant = 'dark',
  className,
  style,
  title,
  onClose,
  onBack,
  children,
  bar = true,
}: {
  id: string;
  variant?: 'dark' | 'light' | 'clear';
  className?: string;
  style?: CSSProperties;
  title: string;
  onClose?: () => void;
  onBack?: () => void;
  children: ReactNode;
  bar?: boolean;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 20);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <section
      className={`os-win is-${variant} ${shown ? 'is-shown' : ''} ${className ?? ''}`}
      style={{ ...style, '--dx': `${pos.x}px`, '--dy': `${pos.y}px` } as CSSProperties}
      aria-label={title}
      data-window={id}
    >
      <div className="os-win-glass">
        {(onBack || onClose) && (
          <div className="os-win-chrome">
            {onBack ? (
              <button type="button" className="os-round" aria-label="Back" data-voice="back" onClick={onBack}>
                <CaretLeft weight="bold" />
              </button>
            ) : (
              <span />
            )}
            {onClose && (
              <button type="button" className="os-round" aria-label={`Close ${title}`} data-voice="close" onClick={onClose}>
                <X weight="bold" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
      {bar && (
        <div
          className="os-win-bar"
          role="slider"
          aria-label={`Move ${title}`}
          aria-valuetext="Drag to move"
          aria-valuenow={0}
          tabIndex={0}
          data-drag=""
          onPointerDown={(e) => {
            try {
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
            } catch {
              /* synthetic pointer */
            }
            drag.current = { x: pos.x, y: pos.y, px: e.clientX, py: e.clientY };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (d) setPos({ x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py });
          }}
          onPointerUp={() => (drag.current = null)}
          onKeyDown={(e) => {
            const k: Record<string, [number, number]> = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] };
            const m = k[e.key];
            if (!m) return;
            e.stopPropagation();
            e.preventDefault();
            setPos((p) => ({ x: p.x + m[0], y: p.y + m[1] }));
          }}
        />
      )}
    </section>
  );
}
