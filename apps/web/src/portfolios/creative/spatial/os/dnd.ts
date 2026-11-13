import { useRef, type DragEvent as ReactDragEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { playUi } from '../store';

/**
 * Drag and drop for cards, with mouse, touch or a pinch (hand mode sends the same pointer events
 * to elements marked `data-drag`). Press and move a card: a copy lifts out (so nothing clips it),
 * follows the pointer and tilts with the motion; any element with `data-drop="<zone>"` under the
 * pointer lights up. Release over a zone and the card flies into it; anywhere else it springs
 * back. A press that hardly moves is a tap.
 *
 * Moves and the release are followed on the whole window, so a fast drag never "loses" the card.
 */

export interface DragOptions {
  id: string;
  /** zone: the `data-drop` value; target: the element dropped on (for swaps). */
  onDrop?: (zone: string, id: string, target: HTMLElement) => void;
  onTap?: () => void;
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export function useDrag({ id, onDrop, onTap }: DragOptions) {
  const opts = useRef({ id, onDrop, onTap });
  opts.current = { id, onDrop, onTap };
  const active = useRef(false);

  const start = (el: HTMLElement, x0: number, y0: number) => {
    if (active.current) return;
    active.current = true;
    const rect = el.getBoundingClientRect();
    let moved = false;
    let ghost: HTMLElement | null = null;
    let zone: HTMLElement | null = null;
    let lastX = x0;

    const zoneAt = (x: number, y: number) => {
      if (ghost) ghost.style.visibility = 'hidden';
      const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop]') ?? null;
      if (ghost) ghost.style.visibility = '';
      return hit && hit !== el && !el.contains(hit) ? hit : null;
    };

    const lift = () => {
      const g = el.cloneNode(true) as HTMLElement;
      g.removeAttribute('data-drag');
      g.removeAttribute('data-drop');
      g.setAttribute('aria-hidden', 'true');
      g.classList.add('os-ghost');
      Object.assign(g.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: '0',
        zIndex: '1000',
        pointerEvents: 'none',
        animation: 'none',
        translate: 'none',
        rotate: 'none',
        transformOrigin: '50% 50%',
        transition: `transform 90ms ${EASE}`,
      });
      (el.closest('.sp') ?? document.body).appendChild(g);
      ghost = g;
      el.classList.add('is-lifted');
      document.body.classList.add('os-dragging');
      playUi('tap');
    };

    const move = (e: PointerEvent) => {
      const dx = e.clientX - x0;
      const dy = e.clientY - y0;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      if (!moved) {
        moved = true;
        lift();
      }
      e.preventDefault();
      const tilt = Math.max(-12, Math.min(12, (e.clientX - lastX) * 0.9));
      lastX = e.clientX;
      if (ghost) ghost.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${tilt}deg) scale(1.06)`;
      const z = zoneAt(e.clientX, e.clientY);
      if (z !== zone) {
        zone?.classList.remove('is-over');
        z?.classList.add('is-over');
        zone = z;
      }
    };

    const finish = (e: PointerEvent | null, cancelled: boolean) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      active.current = false;
      if (!moved) {
        if (!cancelled) opts.current.onTap?.();
        return;
      }
      if (e && !zone) zone = zoneAt(e.clientX, e.clientY);
      const target = cancelled ? null : zone;
      document.body.classList.remove('os-dragging');
      zone?.classList.remove('is-over');
      const g = ghost!;
      // Fly into the zone (shrinking as it lands), or spring back to where it came from.
      let to = 'translate3d(0, 0, 0) rotate(0deg) scale(1)';
      if (target) {
        const z = target.getBoundingClientRect();
        const tx = z.left + z.width / 2 - (rect.left + rect.width / 2);
        const ty = z.top + z.height / 2 - (rect.top + rect.height / 2);
        const sc = Math.min(1, Math.max(0.3, Math.min(z.width / rect.width, z.height / rect.height)));
        to = `translate3d(${tx}px, ${ty}px, 0) rotate(0deg) scale(${sc})`;
      }
      g.style.transition = `transform 480ms ${target ? EASE : SPRING}, opacity 480ms ${EASE}`;
      g.style.transform = to;
      if (target) g.style.opacity = '0';
      window.setTimeout(() => {
        g.remove();
        el.classList.remove('is-lifted');
      }, 500);
      if (target?.dataset.drop) {
        opts.current.onDrop?.(target.dataset.drop, opts.current.id, target);
        playUi('open');
      }
      // A drag is not a click.
      const swallow = (ev: Event) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      el.addEventListener('click', swallow, { capture: true, once: true });
      window.setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 50);
    };
    const up = (e: PointerEvent) => finish(e, false);
    const cancel = () => finish(null, true);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  };

  return {
    'data-drag': '',
    onPointerDown(e: ReactPointerEvent<HTMLElement>) {
      if (e.button > 0) return;
      // Controls inside a card keep working as controls.
      const ctl = e.target instanceof Element ? e.target.closest('button, a, input, textarea, [role="slider"], [role="switch"]') : null;
      if (ctl && ctl !== e.currentTarget) return;
      start(e.currentTarget, e.clientX, e.clientY);
    },
    /** Keyboard (Enter / Space) opens the card too. */
    onClick(e: ReactMouseEvent<HTMLElement>) {
      if (e.detail === 0) opts.current.onTap?.();
    },
    onDragStart(e: ReactDragEvent<HTMLElement>) {
      e.preventDefault();
    },
  };
}
