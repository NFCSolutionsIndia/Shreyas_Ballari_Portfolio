/**
 * Journey Through Time: the nine chapters, the single source of truth for the Creative tab's
 * scene (calendar page, dial, polaroids, milestone card, timeline, map) and its accessible list.
 * Content follows the brief's table (docs/journey-brief.md), updated with the family's details of
 * 2026-11-10: Fulton Science Academy is in Alpharetta, Georgia; Project Arrow since 2nd grade at
 * IPSD 204; PSAT and MAP percentiles; Principal's Honors List; tutoring 7th and 8th graders.
 * - `verified: false` marks labels that are not confirmed facts yet (the K–5 framing).
 * Images are AI renders exported from Figma: placeholders until real photos or licensed art.
 */

const img = (name: string) => `${import.meta.env.BASE_URL}assets/journey/${name}.placeholder.jpg`;

export type Chapter = {
  slug: string;
  /** Dial tile and timeline label. */
  label: string;
  timelineSub: string;
  /** Calendar page text. */
  page: { month: string; big: string; circled: string };
  title: string;
  date: string;
  place: string;
  description: string;
  tags: string[];
  image: string;
  polaroidCaption: string;
  /** Position on the Key Chapters map, 0–5 (fractions sit between points). */
  mapPosition: number;
  verified: boolean;
};

export const CHAPTERS: Chapter[] = [
  {
    slug: 'k5-the-beginning',
    label: 'K–5',
    timelineSub: 'The Beginning',
    page: { month: 'Early', big: 'K–5', circled: 'Ch. 01' },
    title: 'The Beginning',
    date: 'Elementary years',
    place: 'Nancy Young Elementary',
    description: 'Where the journey began — the first school days and the first big questions.',
    tags: ['School', 'Curiosity'],
    image: img('backpack'),
    polaroidCaption: 'First days',
    mapPosition: 0,
    verified: false,
  },
  {
    slug: '2021-mini-med',
    label: '2021',
    timelineSub: 'Mini-Med',
    page: { month: 'Jul', big: '2021', circled: 'Ch. 02' },
    title: 'Mini-Medical School',
    date: 'July 2021',
    place: 'Certificate',
    description: 'Earned a Mini-Medical School certificate — a first real look at how medicine works.',
    tags: ['Medicine', 'Certificate'],
    image: img('medical'),
    polaroidCaption: 'Mini-Med',
    mapPosition: 1,
    verified: true,
  },
  {
    slug: 'project-arrow',
    label: '2nd',
    timelineSub: 'Project Arrow',
    page: { month: 'Since', big: '2nd', circled: 'Ch. 03' },
    title: 'Project Arrow',
    date: 'Since 2nd grade',
    place: 'IPSD 204',
    description: 'Placed in Project Arrow at Indian Prairie School District 204 since 2nd grade.',
    tags: ['Project Arrow', 'IPSD 204'],
    image: img('arrow'),
    polaroidCaption: 'Project Arrow',
    mapPosition: 1.5,
    verified: true,
  },
  {
    slug: '2023-young-authors',
    label: '2023',
    timelineSub: 'Young Authors',
    page: { month: 'Award', big: '2023', circled: 'Ch. 04' },
    title: 'Young Authors Winner',
    date: '2023',
    place: 'District 204',
    description: 'Won the Young Authors Contest in District 204.',
    tags: ['Writing', 'Award'],
    image: img('writing'),
    polaroidCaption: 'Young Authors',
    mapPosition: 2,
    verified: true,
  },
  {
    slug: 'psat-99th',
    label: '99th',
    timelineSub: 'PSAT · MAP',
    page: { month: 'PSAT', big: '99th', circled: 'Percentile' },
    title: '99th Percentile',
    date: 'PSAT and MAP',
    place: 'PSAT 8/9: 1280 / 1440',
    description: 'PSAT percentiles of 99th (8th grade), 98th (9th) and 99th (10th); MAP 98th (9th) and 99th (10th). Recipient of the College Board National Recognition Program award.',
    tags: ['PSAT', 'MAP', 'College Board NRP'],
    image: img('trophy'),
    polaroidCaption: '99th percentile',
    mapPosition: 3,
    verified: true,
  },
  {
    slug: '9-12-fulton',
    label: '9–12',
    timelineSub: 'Fulton',
    page: { month: 'Junior', big: 'FSA', circled: 'Ch. 06' },
    title: 'Fulton Science Academy',
    date: 'Junior, now',
    place: 'Alpharetta, Georgia',
    description: 'AP Computer Science, Biology, Chemistry and Physics C; the Principal’s Honors List in 2025 and 2026; Science Olympiad and DECA.',
    tags: ['AP', 'Honors List', 'DECA'],
    image: img('academy'),
    polaroidCaption: 'Fulton',
    mapPosition: 3.5,
    verified: true,
  },
  {
    slug: 'tutor-giving-back',
    label: 'Tutor',
    timelineSub: 'Giving back',
    page: { month: 'Giving', big: 'Tutor', circled: 'Ch. 07' },
    title: 'Peer Tutor',
    date: 'Ongoing',
    place: 'Peer tutoring',
    description: 'Tutored 7th and 8th grade students in Math and Science; volunteers at the TAMA Medical Camp and the Sri Shirdi Sai Temple.',
    tags: ['Math', 'Science', 'Volunteering'],
    image: img('tutor'),
    polaroidCaption: 'Tutoring',
    mapPosition: 3.8,
    verified: true,
  },
  {
    slug: '2026-oncure',
    label: '2026',
    timelineSub: 'Oncure',
    page: { month: 'Research', big: '2026', circled: 'Ch. 08' },
    title: 'Oncure',
    date: '2026',
    place: 'Research proposal',
    description: 'A research proposal for AI-guided nanobot cancer therapy — a concept, not a cure.',
    tags: ['AI', 'Nanobots'],
    image: img('oncure'),
    polaroidCaption: 'Oncure',
    mapPosition: 4,
    verified: true,
  },
  {
    slug: 'now-finance-app',
    label: 'Now',
    timelineSub: 'What’s next?',
    page: { month: 'Building', big: 'Now', circled: 'Ch. 09' },
    title: 'AI Trading App',
    date: 'In progress',
    place: 'Stock trading app',
    description: 'Building a beginner-friendly stock trading site where an AI model suggests how much to buy, when to buy and when to sell.',
    tags: ['FinTech', 'AI', 'In progress'],
    image: img('trading'),
    polaroidCaption: 'Finance app',
    mapPosition: 5,
    verified: true,
  },
];

/** Key Chapters map points 0–5. */
export const MAP_POINTS = [
  { title: 'The Beginning', sub: 'K–5' },
  { title: 'Medicine', sub: '2021' },
  { title: 'Young Authors', sub: '2023' },
  { title: '99th percentile', sub: 'PSAT · MAP' },
  { title: 'Oncure', sub: '2026' },
  { title: 'Building now', sub: 'Now' },
] as const;

export const JOURNEY_ART = {
  backdrop: img('backdrop'),
  calendar: img('calendar-render'),
  parchment: img('parchment-map'),
};
