import { Head } from 'vite-react-ssg';

/** Renders a JSON-LD block. `<` is escaped so content can never close the script tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(
    /</g,
    '\\u003c',
  );
  return (
    <Head>
      <script type="application/ld+json">{json}</script>
    </Head>
  );
}
