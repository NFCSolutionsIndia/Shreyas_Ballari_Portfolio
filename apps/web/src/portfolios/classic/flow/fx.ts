import { useEffect, useRef } from 'react';

/** One update per frame, given the film's progress (0..1) and the screen size. */
export type Fx = (t: number, vw: number, vh: number) => void;
export type Reg = (fx: Fx) => () => void;

/** Register a chapter's update with the film's single loop. */
export function useFx(reg: Reg, fx: Fx) {
  const f = useRef(fx);
  f.current = fx;
  useEffect(() => reg((t, w, h) => f.current(t, w, h)), [reg]);
}

export const show = (el: HTMLElement | SVGElement | null | undefined, on: boolean) => {
  if (el) el.style.visibility = on ? 'visible' : 'hidden';
};
