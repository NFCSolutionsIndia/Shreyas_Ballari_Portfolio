import { useEffect, useRef, type ReactNode } from 'react';
import { profile } from '@/content/portfolio';
import { ContactPanel } from '@/features/details/Contact';
import '@/features/details/style';
import { Activities, Certificates, Education, Goals, Scores, Tutoring } from '@/features/visuals/Visuals';
import './more.css';

/**
 * After the scroll film, the rest of his story as ordinary sections, each with its own
 * background: education, the awards wall with his scores, activities and volunteering, peer
 * tutoring, goals, and the contact form (right on the page, not a separate one).
 * The menu bar's links reach them by id (cx-about, cx-wall, cx-life, cx-tutoring, cx-goals,
 * cx-contact).
 */

function Sec({ id, tone, kicker, title, lede, children, dark = false }: { id: string; tone: string; kicker: string; title: ReactNode; lede?: string; children: ReactNode; dark?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  // The heading rises in the first time the section is seen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          el.classList.add('is-in');
          io.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} id={`cx-${id}`} className={`cx is-${tone} ${dark ? 'vz-on-dark is-dark' : ''}`} aria-labelledby={`cx-${id}-h`}>
      <div className="cx-in">
        <header className="cx-head">
          <p className="cx-kicker">{kicker}</p>
          <h2 id={`cx-${id}-h`} className="cx-h">
            {title}
          </h2>
          {lede && <p className="cx-lede">{lede}</p>}
        </header>
        {children}
      </div>
    </section>
  );
}

export function ClassicMore() {
  return (
    <div className="cx-wrap">
      <Sec id="about" tone="lavender" kicker="Education" title={<>Where {profile.firstName} learns</>} lede={`A ${profile.grade.toLowerCase()} at ${profile.school}, taking all Honors and AP courses.`}>
        <Education />
      </Sec>

      <Sec id="wall" tone="cream" kicker="Achievements and certificates" title="Awards and scores" lede="Every award and certificate, and how his test scores compare nationwide.">
        <Certificates />
        <div className="cx-gap" />
        <Scores />
      </Sec>

      <Sec id="life" tone="night" dark kicker="Beyond the classroom" title="Activities and volunteering" lede="Sport, music, competitions and giving back.">
        <Activities />
      </Sec>

      <Sec id="tutoring" tone="mint" kicker="Peer tutoring" title="Helping others learn" lede="One on one and in groups, at lunch and after school.">
        <Tutoring />
      </Sec>

      <Sec id="goals" tone="ocean" dark kicker="Goals" title="Where he is heading" lede="From university to an AI-enabled oncology lab.">
        <Goals />
      </Sec>

      <section id="cx-contact" className="cx is-paper" aria-label="Contact">
        <div className="cx-in">
          <div className="dt dt--classic cx-contact">
            <ContactPanel />
          </div>
        </div>
      </section>
    </div>
  );
}
