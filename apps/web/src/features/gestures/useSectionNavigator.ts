import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { SmoothScrollContext } from '@/app/providers/SmoothScroll';

/**
 * Moves between the page's sections with a GSAP tween (driving the site's smooth scroll, so
 * wheel, keys and gestures all share one scroll). Tracks which section is in view.
 */
export function useSectionNavigator(ids: readonly string[]) {
  const smooth = useContext(SmoothScrollContext);
  const [index, setIndex] = useState(0);
  const target = useRef(0);
  const tween = useRef<gsap.core.Tween | null>(null);

  // Current section: the one under the top third of the viewport.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (tween.current?.isActive()) return;
      const line = window.innerHeight * 0.35;
      let current = 0;
      ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = i;
      });
      target.current = current;
      setIndex(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [ids]);

  const goTo = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(ids.length - 1, i));
      const el = document.getElementById(ids[next]!);
      if (!el) return;
      target.current = next;
      setIndex(next);
      const y = next === 0 ? 0 : el.getBoundingClientRect().top + window.scrollY - 16;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const proxy = { y: window.scrollY };
      tween.current?.kill();
      tween.current = gsap.to(proxy, {
        y,
        duration: reduce ? 0 : 1.15,
        ease: 'power3.inOut',
        onUpdate: () =>
          smooth ? smooth.scrollToY(proxy.y, { immediate: true }) : window.scrollTo(0, proxy.y),
        onComplete: () => {
          tween.current = null;
          el.focus({ preventScroll: true });
        },
      });
    },
    [ids, smooth],
  );

  const next = useCallback(() => goTo(target.current + 1), [goTo]);
  const prev = useCallback(() => goTo(target.current - 1), [goTo]);

  useEffect(() => () => void tween.current?.kill(), []);

  return { index, goTo, next, prev };
}
