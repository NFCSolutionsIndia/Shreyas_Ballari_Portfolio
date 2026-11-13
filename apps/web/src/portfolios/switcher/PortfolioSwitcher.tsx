import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { PORTFOLIOS, type PortfolioId } from './usePortfolioChoice';

interface PortfolioSwitcherProps {
  value: PortfolioId;
  onChange: (id: PortfolioId) => void;
}

/**
 * Floating tab bar at the bottom centre of every portfolio for choosing between the portfolio styles.
 * Compact, centred, translucent over a blur (landing-page-design B7 navigation), readable over
 * light and dark pages alike. Arrow keys move between tabs.
 */
export function PortfolioSwitcher({ value, onChange }: PortfolioSwitcherProps) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = PORTFOLIOS.findIndex((p) => p.id === value);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const step = e.key === 'ArrowRight' ? 1 : -1;
    const next = (index + step + PORTFOLIOS.length) % PORTFOLIOS.length;
    const target = PORTFOLIOS[next];
    if (target) {
      onChange(target.id);
      tabs.current[next]?.focus();
    }
  };

  return (
    <div className="portfolio-switcher pointer-events-none fixed inset-x-0 bottom-3 z-[80] flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
      <div
        role="tablist"
        aria-label="Portfolio style"
        onKeyDown={onKeyDown}
        className="pointer-events-auto relative grid grid-cols-4 rounded-xl bg-black/70 p-1 font-sans text-white shadow-md backdrop-blur-md"
      >
        {/* Sliding highlight behind the active tab, moved only with transform (B7). */}
        <span
          aria-hidden="true"
          className="absolute top-1 bottom-1 left-1 rounded-lg bg-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `calc((100% - 8px) / ${PORTFOLIOS.length})`, transform: `translateX(${index * 100}%)` }}
        />
        {PORTFOLIOS.map((p, i) => {
          const active = p.id === value;
          return (
            <button
              key={p.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(p.id)}
              className={cn(
                'button-sm relative min-h-9 rounded-lg px-3 py-2 whitespace-nowrap transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98]',
                active ? 'text-black' : 'text-white/75 hover:text-white',
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
