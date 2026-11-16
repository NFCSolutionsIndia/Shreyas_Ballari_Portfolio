import { useMemo, useState } from 'react';
import { ArrowCounterClockwise, ArrowRight, CheckCircle, XCircle } from '@phosphor-icons/react';
import { achievements, activities, courses, goals, languages, percentiles, profile, volunteering } from '@/content/portfolio';
import { useReducedMotion } from './useReducedMotion';
import './fun.css';

interface Question {
  id: string;
  prompt: string;
  correct: string;
  wrong: [string, string, string];
  explain: string;
}

const list = (items: readonly string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/**
 * Every correct answer and explanation comes from '@/content/portfolio'. Wrong options are generic
 * alternatives and make no claim about Shreyas.
 */
function buildQuestions(): Question[] {
  const qs: Question[] = [];
  const guitar = activities.find((a) => a.title === 'Guitar');
  const muayThai = activities.find((a) => a.title === 'Muay Thai');
  const psat10 = percentiles.find((p) => p.test === 'PSAT' && p.grade === '10th grade');
  const authors = achievements.find((a) => a.id === 'authors');
  const tama = volunteering.find((v) => v.title === 'TAMA Medical Camp');
  const labGoal = goals.career.find((g) => g.toLowerCase().includes('oncology'));
  const apScience = courses.find((c) => c === 'AP Physics C');

  qs.push({
    id: 'school',
    prompt: 'Which school does Shreyas attend?',
    correct: profile.school,
    wrong: ['Riverside Preparatory School', 'Lakeview STEM Academy', 'Northbridge High School'],
    explain: `He is a ${profile.grade.toLowerCase()} at ${profile.school} in ${profile.schoolTown}.`,
  });
  if (guitar) {
    qs.push({
      id: 'instrument',
      prompt: 'Which instrument has Shreyas played since 2021?',
      correct: 'Guitar',
      wrong: ['Violin', 'Drums', 'Trumpet'],
      explain: `Guitar. ${guitar.role.split(' · ')[0] ?? 'Since 2021'}, with ${guitar.role.split(' · ')[1] ?? 'Atlanta Piano Fortissimo'}.`,
    });
  }
  if (muayThai) {
    qs.push({
      id: 'martial-art',
      prompt: 'Which martial art does he train in?',
      correct: 'Muay Thai',
      wrong: ['Karate', 'Judo', 'Fencing'],
      explain: `Muay Thai, ${muayThai.role.replace('Martial arts, ', '')}. He also swims with the Swim Atlanta Senior Team.`,
    });
  }
  if (languages.length > 0) {
    qs.push({
      id: 'languages',
      prompt: 'Which programming languages are listed on his portfolio?',
      correct: list(languages),
      wrong: ['C++, Go and Rust', 'Swift, Kotlin and Ruby', 'PHP, Perl and Lua'],
      explain: `${list(languages)}, alongside courses like AP Computer Science Principles and AP Computer Science A.`,
    });
  }
  qs.push({
    id: 'oncure',
    prompt: 'What is Oncure?',
    correct: 'His research concept for AI-guided nanobot cancer therapy',
    wrong: ['A beginner-friendly stock trading app', 'A swim-training tracker', 'A Spanish vocabulary game'],
    explain:
      'Oncure is a research concept: nanobots guided by AI that could deliver therapy to tumour cells while sparing healthy tissue. (The stock trading app is a separate project.)',
  });
  if (psat10) {
    qs.push({
      id: 'psat',
      prompt: `What was his PSAT percentile in ${psat10.grade}?`,
      correct: `Top ${psat10.value}%`,
      wrong: ['85th', '90th', '94th'],
      explain: `Top ${psat10.value}%. His PSAT results were ${percentiles
        .filter((p) => p.test === 'PSAT')
        .map((p) => `top ${p.value}% (${p.grade})`)
        .join(', ')}.`,
    });
  }
  if (authors) {
    qs.push({
      id: 'authors',
      prompt: 'Which writing contest did Shreyas win?',
      correct: authors.title,
      wrong: ['National Poetry Slam', 'Global Essay Challenge', 'Young Journalists Prize'],
      explain: authors.detail,
    });
  }
  if (labGoal) {
    qs.push({
      id: 'goal',
      prompt: 'Which of these is one of his career goals?',
      correct: labGoal.replace(/\.$/, ''),
      wrong: ['Open a chain of coffee shops', 'Become a professional chess player', 'Design video game levels'],
      explain: `His goals include: ${goals.career.map((g) => g.charAt(0).toLowerCase() + g.slice(1).replace(/\.$/, '')).join('; ')}.`,
    });
  } else if (tama) {
    qs.push({
      id: 'volunteer',
      prompt: 'Where has he volunteered as a student volunteer?',
      correct: tama.title,
      wrong: ['A city marathon', 'A coastal clean-up crew', 'A robotics summer camp'],
      explain: `${tama.role} at the ${tama.title}.`,
    });
  } else if (apScience) {
    qs.push({
      id: 'course',
      prompt: 'Which AP science course is on his list?',
      correct: apScience,
      wrong: ['AP Environmental Science', 'AP Psychology', 'AP Art History'],
      explain: `His courses include ${list(courses.slice(0, 5))}.`,
    });
  }
  return qs;
}

const shuffle = <T,>(arr: readonly T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
};

const LETTERS = ['a', 'b', 'c', 'd'] as const;

interface Round {
  questions: { q: Question; options: string[] }[];
}

const makeRound = (): Round => ({
  questions: buildQuestions().map((q) => ({ q, options: shuffle([q.correct, ...q.wrong]) })),
});

export function Quiz() {
  const [round, setRound] = useState<Round>(makeRound);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [roundKey, setRoundKey] = useState(0);
  const reduced = useReducedMotion();

  const total = round.questions.length;
  const finished = index >= total;
  const current = round.questions[index];
  const score = useMemo(() => results.filter(Boolean).length, [results]);

  const answer = (option: string) => {
    if (!current || picked !== null) return;
    setPicked(option);
    setResults((r) => [...r, option === current.q.correct]);
  };

  const next = () => {
    setPicked(null);
    setIndex((i) => i + 1);
  };

  const restart = () => {
    setRound(makeRound());
    setIndex(0);
    setPicked(null);
    setResults([]);
    setRoundKey((k) => k + 1);
  };

  const verdict =
    score === total
      ? 'Perfect score. You know Shreyas well!'
      : score >= total * 0.6
        ? 'Nicely done. You have been paying attention.'
        : 'Good try. Explore the portfolio and come back for another round.';

  return (
    <section className="fun-card fun-quiz" aria-label="Quiz: how well do you know Shreyas?">
      <header className="fun-quiz__head">
        <div>
          <p className="fun-eyebrow">Quiz</p>
          <h3 className="fun-title">How well do you know Shreyas?</h3>
        </div>
        <ol className="fun-dots" aria-label={`Question ${Math.min(index + 1, total)} of ${total}`}>
          {round.questions.map(({ q }, i) => {
            const r = results[i];
            const cls = r === undefined ? (i === index ? 'is-current' : '') : r ? 'is-right' : 'is-wrong';
            return <li key={q.id} className={`fun-dot ${cls}`} aria-hidden="true" />;
          })}
        </ol>
      </header>

      <div className="fun-quiz__viewport">
        {!finished && current && (
          <div key={`${roundKey}-${index}`} className={`fun-quiz__card${reduced ? '' : ' is-animated'}`}>
            <p className="fun-small fun-muted">
              Question {index + 1} of {total}
            </p>
            <p className="fun-quiz__prompt">{current.q.prompt}</p>
            <div className="fun-quiz__options">
              {current.options.map((opt, i) => {
                const letter = LETTERS[i] ?? 'a';
                const state =
                  picked === null ? '' : opt === current.q.correct ? ' is-right' : opt === picked ? ' is-wrong' : ' is-dim';
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`fun-option${state}`}
                    data-voice={`answer ${letter}`}
                    aria-disabled={picked !== null}
                    onClick={() => answer(opt)}
                  >
                    <span className="fun-option__letter">{letter.toUpperCase()}</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div className={`fun-quiz__feedback ${picked === current.q.correct ? 'is-right' : 'is-wrong'}`} role="status">
                <p className="fun-quiz__verdict">
                  {picked === current.q.correct ? (
                    <>
                      <CheckCircle size={20} weight="fill" aria-hidden="true" /> Correct!
                    </>
                  ) : (
                    <>
                      <XCircle size={20} weight="fill" aria-hidden="true" /> Not quite.
                    </>
                  )}
                </p>
                <p>{current.q.explain}</p>
                <button type="button" className="fun-btn fun-btn--primary" data-voice="next question" onClick={next}>
                  {index + 1 < total ? 'Next question' : 'See my score'} <ArrowRight size={18} weight="bold" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}
        {finished && (
          <div key={`${roundKey}-done`} className={`fun-quiz__card fun-quiz__end${reduced ? '' : ' is-animated'}`} role="status">
            <p className="fun-eyebrow">Your score</p>
            <p className="fun-quiz__final">
              {score}
              <span>/{total}</span>
            </p>
            <p>{verdict}</p>
            <button type="button" className="fun-btn fun-btn--primary" data-voice="play again" onClick={restart}>
              <ArrowCounterClockwise size={18} weight="bold" aria-hidden="true" /> Play again
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
