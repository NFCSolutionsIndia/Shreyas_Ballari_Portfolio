import type { Copy } from '@/content/portfolio';
import { cn } from '@/lib/cn';

/** Visible marker for content that still has to be supplied. */
export function PlaceholderTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'label-mono inline-flex items-center gap-1.5 rounded-[2px] border border-dashed border-border-strong px-2 py-1 text-[0.625rem] text-text-muted',
        className,
      )}
    >
      To be supplied
    </span>
  );
}

/**
 * Renders a piece of content-config copy. Placeholders are shown in a muted style with a
 * "To be supplied" tag; draft and confirmed copy render normally.
 */
export function CopyText({ copy, className }: { copy: Copy; className?: string }) {
  if (copy.status === 'placeholder') {
    return (
      <span className={cn('inline-flex flex-wrap items-center gap-3 text-text-muted', className)}>
        <PlaceholderTag />
        <span className="italic">{copy.text}</span>
      </span>
    );
  }
  return <span className={className}>{copy.text}</span>;
}

interface PlaceholderFrameProps {
  label: string;
  hint?: string;
  className?: string;
}

/** Stand-in for a photo or screenshot that hasn't been supplied yet. */
export function PlaceholderFrame({ label, hint, className }: PlaceholderFrameProps) {
  return (
    <div
      role="img"
      aria-label={`${label}: placeholder, image to be supplied`}
      className={cn(
        'relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden bg-panel text-center',
        'bg-[radial-gradient(rgb(255_255_255/0.09)_1px,transparent_1.2px)] bg-[length:14px_14px]',
        className,
      )}
    >
      <span className="label-mono text-text-soft">{label}</span>
      {hint && <span className="label-mono text-[0.625rem] text-text-muted">{hint}</span>}
    </div>
  );
}
