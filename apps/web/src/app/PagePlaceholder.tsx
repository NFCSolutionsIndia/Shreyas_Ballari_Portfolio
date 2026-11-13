import { Section } from '@/components/layout/Section';
import { Seo } from '@/components/seo/Seo';

interface PagePlaceholderProps {
  title: string;
  description: string;
}

/** Temporary body for routes whose sections are built later in the plan. */
export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <>
      <Seo title={title} description={description} />
      <Section as="h1" title={title} intro={description} />
    </>
  );
}
