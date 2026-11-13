import { achievements, activities, oncure, resume, stockApp, volunteering } from '@/content/portfolio';

/**
 * The six cards on the ring. Clicking one plays the star animation into its details; without a
 * click the film shows Oncure. Everything here comes from his own material (portfolio.ts, the
 * Oncure proposal and the resume).
 */

const BASE = import.meta.env.BASE_URL;
const J = (n: string) => `${BASE}assets/journey/${n}.placeholder.jpg`;

export interface Topic {
  id: string;
  tag: string;
  title: string;
  line: string;
  tone: 'violet' | 'night' | 'lime';
  image: string;
  /** The detail chapter. */
  kicker: string;
  heading: string;
  summary: string;
  points: { title: string; line?: string }[];
  video?: string;
  note?: string;
  to?: { label: string; href: string };
}

export const TOPICS: Topic[] = [
  {
    id: 'oncure',
    tag: 'Research',
    title: 'Oncure',
    line: 'AI-guided nanobots for targeted cancer therapy. A concept.',
    tone: 'violet',
    image: J('oncure'),
    kicker: 'Research proposal · 2026',
    heading: 'Oncure',
    summary: oncure.summary,
    points: oncure.steps.map((s) => ({ title: s.title, line: s.line })),
    video: oncure.video,
    note: oncure.disclaimer,
    to: { label: 'Read the full proposal', href: '/research/oncure' },
  },
  {
    id: 'trading',
    tag: 'FinTech',
    title: 'AI trading app',
    line: 'Advice beside the chart, made for beginners.',
    tone: 'night',
    image: J('trading'),
    kicker: 'Personal project · 2026 · in progress',
    heading: 'Stock Trading Finance App',
    summary: stockApp.summary,
    points: stockApp.features.slice(0, 6).map((f) => ({ title: f.title, line: f.line })),
    note: 'Suggestions are hypothetical, not financial advice.',
    to: { label: 'See the app concept', href: '/projects/stock-trading-app' },
  },
  {
    id: 'tutoring',
    tag: 'Teaching',
    title: 'Peer tutoring',
    line: 'Math and Science, one step at a time.',
    tone: 'lime',
    image: J('tutor'),
    kicker: 'Experience · one on one and small groups',
    heading: 'Peer tutor',
    summary: resume.summary,
    points: resume.tutoring.map((t) => ({ title: t })),
    to: { label: 'How he tutors', href: '/tutoring' },
  },
  {
    id: 'awards',
    tag: 'Recognition',
    title: 'Seven awards',
    line: 'College Board National Recognition Program and more.',
    tone: 'violet',
    image: J('trophy'),
    kicker: 'Awards and achievements',
    heading: 'Recognition',
    summary: 'Top 1% national scores in mathematics and English, all Honors and AP coursework, and awards from elementary school to high school.',
    points: achievements.map((a) => ({ title: a.title, line: a.detail })),
    to: { label: 'All achievements', href: '/achievements' },
  },
  {
    id: 'writing',
    tag: 'Writing',
    title: 'Young Authors',
    line: 'Contest winner, 2023.',
    tone: 'night',
    image: J('writing'),
    kicker: 'Award · Indian Prairie School District 204 · 2023',
    heading: 'Young Authors winner',
    summary: 'He won the Young Authors Contest in 2023. Writing runs through his work: Honors English Literature, essay and research writing, and a research proposal backed by sourced data.',
    points: [
      { title: 'Young Authors Contest', line: 'Winner, Indian Prairie School District 204 (2023).' },
      { title: 'English Literature Honors', line: 'Advanced literature in high school.' },
      { title: 'Research writing', line: 'The Oncure proposal, with WHO, IARC, NCI, NIH and American Cancer Society sources.' },
      { title: 'Creative writing', line: 'One of his areas of interest.' },
    ],
  },
  {
    id: 'activities',
    tag: 'Beyond class',
    title: 'Music & sport',
    line: 'Guitar, swimming and Muay Thai.',
    tone: 'lime',
    image: `${BASE}assets/house/stills/music.jpg`,
    kicker: 'Activities and volunteering',
    heading: 'Beyond the classroom',
    summary: 'Sport, music, competitions and service: the things he does when he is not studying or building.',
    points: [...activities.map((a) => ({ title: a.title, line: a.role })), ...volunteering.map((v) => ({ title: v.title, line: v.role }))],
  },
];

/** The problem Oncure targets: figures from his proposal, with their sources. */
export const PROBLEM = [
  { value: 20, suffix: 'M', label: 'people diagnosed with cancer every year', source: 'World Health Organization' },
  { value: 10, suffix: 'M', label: 'deaths from cancer every year', source: 'IARC / GLOBOCAN' },
  { value: 8, prefix: '6–', suffix: ' mo', label: 'a standard chemotherapy regimen for late-stage lung cancer', source: 'American Cancer Society' },
  { value: 100, prefix: '$', suffix: 'k+', label: 'possible out-of-pocket cost, even with insurance', source: 'American Cancer Society' },
  { value: 25, prefix: '15–', suffix: '%', label: 'of people with cancer develop clinical depression', source: 'NIH / PubMed' },
];

export const STEPS = oncure.steps;

export const CHALLENGES = oncure.challenges;
export const ROADMAP = oncure.roadmap;
