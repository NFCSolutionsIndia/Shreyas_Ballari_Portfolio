import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'primary' | 'accent' | 'success';

const tones: Record<Tone, string> = {
  neutral: 'border-border-strong text-text-muted',
  primary: 'border-primary text-primary',
  accent: 'border-accent text-accent',
  success: 'border-success text-success',
};

// Badges always carry a text label, so status is never conveyed by colour alone.
export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-sm font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
