import { Section } from '@/components/layout/Section';
import { Seo } from '@/components/seo/Seo';
import { profile, stockApp } from '@/content/portfolio';

/** The AI stock trading app, from Shreyas's own description (formatted). */
export function Component() {
  const steps = [
    { n: '01', title: 'Real-world data in', line: 'The app reads real market data and real-world factors.' },
    { n: '02', title: 'AI model and algorithms', line: 'An AI model works out the best hypothetical choice for each stock.' },
    { n: '03', title: 'Plain advice out', line: 'How much to buy, when to buy and an estimated time to sell, shown beside the chart.' },
  ];
  return (
    <>
      <Seo title={stockApp.name} description={stockApp.summary} />
      <Section as="h1" eyebrow={`Project · ${stockApp.status}`} title={stockApp.name} intro={<p>{stockApp.summary}</p>}>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <article key={s.n} className="rounded-2xl border border-border p-6">
              <p className="text-sm font-semibold text-accent">{s.n}</p>
              <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-text-muted">{s.line}</p>
            </article>
          ))}
        </div>
      </Section>
      <Section eyebrow="Features" title="What the app will have">
        <ul className="grid gap-4 md:grid-cols-2">
          {stockApp.features.map((f) => (
            <li key={f.title} className="rounded-2xl border border-border p-6">
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-text-muted">{f.line}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section eyebrow="Who it is for" title="Beginners and veterans">
        <p className="max-w-3xl text-text-muted">
          {stockApp.forWhom} Instead of candlestick charts and equations, the AI explains the decision in plain terms.
        </p>
        <p className="mt-6 max-w-3xl text-sm text-text-muted">
          Built by {profile.name}, a {profile.grade.toLowerCase()} at {profile.school}. Screens and the technologies used:{' '}
          <em>to be supplied</em>.
        </p>
      </Section>
    </>
  );
}
