import { achievements, activities, courses, goals, languages, oncure, percentiles, resume, stockApp, volunteering } from '@/content/portfolio';
import type { StationName } from './stations';

/**
 * Things you can click in each room of the house: a glowing point on the real object (its
 * position in metres, the same frame as layout.ts) and what it tells you. Every fact comes from
 * content/portfolio.ts. The 3D scene moves the points to where the objects are on screen.
 */

export interface Hotspot {
  id: string;
  station: StationName;
  pos: [number, number, number];
  /** Short label on the point. */
  label: string;
  title: string;
  kicker: string;
  text: string;
  items?: string[];
  /** An app that goes deeper. */
  app?: { id: string; label: string };
  /** Open the small AI chat instead. */
  ask?: boolean;
  /** Offer his Oncure video in full view. */
  video?: boolean;
  tint?: string;
}

const ach = (id: string) => achievements.find((a) => a.id === id)!;
const pct = (test: string) => percentiles.filter((p) => p.test === test).map((p) => `${p.grade}: ${p.value}th percentile`);
const act = (t: string) => activities.find((a) => a.title === t)!;
const GOLD = '#ffd770';
const PINK = '#e0466e';
const GREEN = '#22a06b';
const BLUE = '#5b7cfa';
const SKY = '#3bb2d6';
const ORANGE = '#f28c28';

export const HOTSPOTS: Hotspot[] = [
  // --- Living room -------------------------------------------------------------------------
  {
    id: 'screen',
    station: 'living',
    pos: [-4.9, 2.25, -0.6],
    label: 'The big screen',
    kicker: 'Living room',
    title: 'Oncure, the film',
    text: `${oncure.pitch} Watch his video about it.`,
    video: true,
    tint: PINK,
  },
  {
    id: 'sofa',
    station: 'living',
    pos: [2.85, 0.9, 0],
    label: 'Ask about him',
    kicker: 'Living room',
    title: 'Have a seat and ask',
    text: 'Ask the AI anything about Shreyas: his research, his app, his school, his awards or his goals. It answers only from his portfolio.',
    ask: true,
    tint: '#9b6bff',
  },
  // --- His room ----------------------------------------------------------------------------
  {
    id: 'code',
    station: 'bedroom',
    pos: [-8.95, 1.12, 0.72],
    label: 'Code',
    kicker: 'His room',
    title: 'Programming languages',
    text: `He writes code in ${languages.join(', ').replace(/, ([^,]*)$/, ' and $1')}.`,
    items: languages,
    tint: BLUE,
  },
  {
    id: 'skills',
    station: 'bedroom',
    pos: [-11.2, 1.0, 1.4],
    label: 'Skills',
    kicker: 'His room',
    title: 'Skills',
    text: resume.summary,
    items: resume.skills,
    tint: BLUE,
  },
  {
    id: 'bed-guitar',
    station: 'bedroom',
    pos: [-10.15, 0.95, 0.95],
    label: 'Guitar',
    kicker: 'His room',
    title: 'Guitar',
    text: `${act('Guitar').role}.`,
    app: { id: 'activities', label: 'Play his guitar pieces' },
    tint: ORANGE,
  },
  // --- Study ---------------------------------------------------------------------------------
  {
    id: 'courses',
    station: 'study',
    pos: [-10.9, 1.6, -4.05],
    label: 'Courses',
    kicker: 'The study',
    title: 'Courses taken',
    text: 'He has always taken advanced courses: all honours and AP in high school, with mathematics through AP Pre-calculus.',
    items: courses,
    tint: BLUE,
  },
  {
    id: 'library',
    station: 'study',
    pos: [-12.55, 1.7, -1.8],
    label: 'Reading and writing',
    kicker: 'The study',
    title: 'Reading and writing',
    text: `${ach('authors').detail} He takes English Literature Honors, and his résumé lists advanced literature and essay writing.`,
    tint: BLUE,
  },
  {
    id: 'laptop',
    station: 'study',
    pos: [-10.35, 0.95, -1.6],
    label: 'Code',
    kicker: 'The study',
    title: 'He writes code',
    text: `In ${languages.join(', ').replace(/, ([^,]*)$/, ' and $1')}, alongside AP Computer Science Principles, AP Computer Science A and Artificial Intelligence.`,
    items: languages,
    tint: BLUE,
  },
  {
    id: 'frames',
    station: 'study',
    pos: [-10.0, 1.6, 0.25],
    label: 'Fulton Science Academy',
    kicker: 'The study',
    title: 'Fulton Science Academy',
    text: `A junior at Fulton Science Academy (FSA) in Alpharetta, Georgia. ${ach('honors').detail}`,
    tint: BLUE,
  },
  // --- Research & Development ------------------------------------------------------------------
  {
    id: 'video',
    station: 'lab',
    pos: [-10.1, 2.3, -8.84],
    label: 'Oncure video',
    kicker: 'Research & Development',
    title: 'Watch his Oncure video',
    text: 'His video about Oncure is playing on the wall screen (muted). Open it in full view with sound.',
    video: true,
    tint: PINK,
  },
  {
    id: 'hologram',
    station: 'lab',
    pos: [-10.25, 1.55, -6.6],
    label: 'Oncure',
    kicker: 'Research & Development',
    title: 'Oncure',
    text: `${oncure.summary} ${oncure.disclaimer}`,
    app: { id: 'oncure', label: 'Open Oncure' },
    tint: PINK,
  },
  {
    id: 'onc-board',
    station: 'lab',
    pos: [-12.05, 1.95, -8.84],
    label: '5 steps',
    kicker: 'Research & Development',
    title: 'How Oncure would work',
    text: 'A conceptual workflow in five steps. It has not been demonstrated as a working treatment.',
    items: oncure.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.line}`),
    tint: PINK,
  },
  {
    id: 'microscope',
    station: 'lab',
    pos: [-12.35, 1.15, -7.9],
    label: 'Challenges',
    kicker: 'Research & Development',
    title: 'What has to be solved',
    text: 'The technology does not exist yet. What would need solving first:',
    items: oncure.challenges.map((c) => `${c.title}: ${c.line}`),
    tint: PINK,
  },
  {
    id: 'trade-board',
    station: 'lab',
    pos: [-8.2, 1.95, -8.84],
    label: 'Trading app',
    kicker: 'Research & Development',
    title: stockApp.name,
    text: `${stockApp.summary} For: ${stockApp.forWhom.charAt(0).toLowerCase()}${stockApp.forWhom.slice(1)}`,
    items: stockApp.features.map((f) => `${f.title}: ${f.line}`),
    app: { id: 'finance', label: 'Open the trading app' },
    tint: GREEN,
  },
  {
    id: 'scr-dash',
    station: 'lab',
    pos: [-9.75, 1.3, -8.6],
    label: 'App: dashboard',
    kicker: 'Trading app · concept screen',
    title: 'Your dashboard',
    text: 'The stocks you hold and the buy or sell stage each one is at, pending buys and sells, and top-performing stocks you may be interested in. Sample data.',
    app: { id: 'finance', label: 'See all the app screens' },
    tint: GREEN,
  },
  {
    id: 'scr-stock',
    station: 'lab',
    pos: [-10.6, 1.3, -8.62],
    label: 'App: AI advice',
    kicker: 'Trading app · concept screen',
    title: 'AI advice next to the graph',
    text: 'Beside the stock you are looking at: how much to buy, when to buy, and an estimated time to sell, worked out by an AI model from real-world data. Instead of candlesticks and equations. Sample data; hypothetical, not financial advice.',
    app: { id: 'finance', label: 'See all the app screens' },
    tint: GREEN,
  },
  {
    id: 'scr-calc',
    station: 'lab',
    pos: [-12.45, 1.3, -5.15],
    label: 'App: calculator',
    kicker: 'Trading app · concept screen',
    title: 'AI calculators',
    text: 'Calculators that use the AI model to suggest the best amount of a stock to buy and when to buy or sell it. Sample data; hypothetical.',
    app: { id: 'finance', label: 'See all the app screens' },
    tint: GREEN,
  },
  // --- Gallery -----------------------------------------------------------------------------------
  {
    id: 'cert-cbnrp',
    station: 'gallery',
    pos: [-12.7, 2.05, -11.55],
    label: 'College Board',
    kicker: 'Certificate',
    title: ach('cbnrp').title,
    text: ach('cbnrp').detail,
    tint: GOLD,
  },
  {
    id: 'cert-psat',
    station: 'gallery',
    pos: [-11.3, 1.65, -13.9],
    label: 'PSAT',
    kicker: 'Certificate',
    title: 'PSAT · top 1%',
    text: ach('psat').detail,
    items: pct('PSAT'),
    tint: GOLD,
  },
  {
    id: 'scores',
    station: 'gallery',
    pos: [-10.15, 1.65, -13.9],
    label: 'Scores chart',
    kicker: 'The gallery',
    title: 'Top percentile scores',
    text: 'PSAT and MAP percentiles across the years.',
    items: [...pct('PSAT').map((x) => `PSAT ${x}`), ...pct('MAP').map((x) => `MAP ${x}`)],
    tint: GOLD,
  },
  {
    id: 'cert-map',
    station: 'gallery',
    pos: [-9.0, 1.65, -13.9],
    label: 'MAP',
    kicker: 'Certificate',
    title: 'MAP · 99th percentile',
    text: ach('map').detail,
    items: pct('MAP'),
    tint: GOLD,
  },
  {
    id: 'cert-honors',
    station: 'gallery',
    pos: [-11.3, 1.65, -9.2],
    label: 'Honors List',
    kicker: 'Honour',
    title: ach('honors').title,
    text: ach('honors').detail,
    tint: GOLD,
  },
  {
    id: 'cert-arrow',
    station: 'gallery',
    pos: [-9.0, 1.65, -9.2],
    label: 'Project Arrow',
    kicker: 'Programme',
    title: ach('arrow').title,
    text: ach('arrow').detail,
    tint: GOLD,
  },
  {
    id: 'cup',
    station: 'gallery',
    pos: [-11.75, 1.35, -11.55],
    label: 'All awards',
    kicker: 'The gallery',
    title: 'Awards and honours',
    text: 'Everything in this room, in one list:',
    items: achievements.map((a) => `${a.title} · ${a.value}`),
    app: { id: 'awards', label: 'Open the awards' },
    tint: GOLD,
  },
  {
    id: 'crystal',
    station: 'gallery',
    pos: [-10.0, 1.3, -10.15],
    label: 'Young Authors',
    kicker: 'Award',
    title: ach('authors').title,
    text: ach('authors').detail,
    tint: GOLD,
  },
  {
    id: 'medal',
    station: 'gallery',
    pos: [-10.0, 1.35, -12.95],
    label: 'Mini-Medical',
    kicker: 'Certificate',
    title: ach('minimed').title,
    text: 'Completed Mini-Medical School for middle school students in July 2021, and received a certificate of completion.',
    tint: GOLD,
  },
  // --- Community room -----------------------------------------------------------------------------
  {
    id: 'tutor-board',
    station: 'kitchen',
    pos: [-2.2, 1.95, -13.9],
    label: 'How he tutors',
    kicker: 'The community room',
    title: 'How Shreyas tutors',
    text: 'Peer tutor for 7th and 8th grade students in mathematics and science, one on one and in small groups, at lunch or after school.',
    items: ['1. Find the gaps: identify lagging skills', '2. Explain step by step, with visual aids and diagrams', '3. Practise together: homework and small groups', '4. Get ready for quizzes and exams', '5. Give feedback on writing and critical thinking'],
    tint: SKY,
  },
  {
    id: 'students',
    station: 'kitchen',
    pos: [-1.6, 1.25, -11.6],
    label: 'Study group',
    kicker: 'The community room',
    title: 'Tutoring sessions',
    text: resume.summary,
    items: resume.tutoring,
    tint: SKY,
  },
  ...volunteering.map((v, i) => ({
    id: `vol-${i}`,
    station: 'kitchen' as StationName,
    pos: [0.55 + i * 0.95, i === 1 ? 1.25 : 2.0, -13.9] as [number, number, number],
    label: ['Medical camp', 'Temple', 'Tutoring'][i]!,
    kicker: 'Giving back',
    title: v.title,
    text: `${v.role}.`,
    tint: ['#e0466e', '#f28c28', '#3b82f6'][i],
  })),
  // --- Music & activities ----------------------------------------------------------------------
  ...['Swim Atlanta', 'Muay Thai', 'Science Olympiad', 'DECA'].map((t, i) => ({
    id: `act-${i}`,
    station: 'music' as StationName,
    pos: [3.22, 2.0, -13.15 + i * 0.98] as [number, number, number],
    label: t,
    kicker: 'Beyond class',
    title: t,
    text: `${act(t).role}.`,
    tint: ['#2bb5e8', '#ff5a6e', '#6c8cff', '#2fd18b'][i],
  })),
  {
    id: 'electric',
    station: 'music',
    pos: [4.35, 1.45, -13.85],
    label: 'Guitar',
    kicker: 'Music & activities',
    title: 'Guitar since 2021',
    text: 'He has played guitar since 2021 at Atlanta Piano Fortissimo.',
    app: { id: 'activities', label: 'Play original guitar pieces' },
    tint: ORANGE,
  },
  {
    id: 'acoustic',
    station: 'music',
    pos: [5.55, 0.95, -12.6],
    label: 'Play music',
    kicker: 'Music & activities',
    title: 'Listen',
    text: 'Original guitar pieces, generated live in your browser (not recordings of him).',
    app: { id: 'activities', label: 'Open the player' },
    tint: ORANGE,
  },
  // --- Garden: goals ---------------------------------------------------------------------------
  {
    id: 'goals',
    station: 'garden',
    pos: [6.7, 2.1, -5.4],
    label: 'His goals',
    kicker: 'Looking ahead',
    title: 'His goals',
    text: goals.education,
    items: goals.career,
    tint: '#ffd166',
  },
  // --- Thank you ------------------------------------------------------------------------------
  {
    id: 'thanks',
    station: 'sofa',
    pos: [-4.9, 1.3, -0.6],
    label: 'Ask the AI',
    kicker: 'Before you go',
    title: 'Any questions?',
    text: 'Ask the AI anything about Shreyas, or open his dashboard to explore every app.',
    ask: true,
    tint: '#9b6bff',
  },
];

/** The on-screen buttons for the points, so the 3D scene can move them every frame. */
export const hotspotEls = new Map<string, HTMLElement>();
