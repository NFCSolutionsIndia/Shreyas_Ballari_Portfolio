import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Container } from './Container';

interface SectionProps {
  eyebrow?: string;
  title?: string;
  intro?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Heading level; pages own the single h1, so sections default to h2. */
  as?: 'h1' | 'h2';
}

export function Section({
  eyebrow,
  title,
  intro,
  children,
  className,
  as: Heading = 'h2',
}: SectionProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={cn('py-[var(--section-pad)]', className)}
    >
      <Container>
        {(eyebrow || title || intro) && (
          <header className="mb-10 max-w-3xl">
            {eyebrow && (
              <p className="mb-2 text-sm font-semibold tracking-wide text-accent uppercase">
                {eyebrow}
              </p>
            )}
            {title && (
              <Heading id={headingId} className="text-3xl font-bold md:text-4xl">
                {title}
              </Heading>
            )}
            {intro && <div className="mt-4 text-text-muted">{intro}</div>}
          </header>
        )}
        {children}
      </Container>
    </section>
  );
}
