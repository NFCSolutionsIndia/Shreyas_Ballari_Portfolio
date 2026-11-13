import { achievements, activities, oncure, resume, stockApp, volunteering } from '@/content/portfolio';

/**
 * The three chapters after the details follow the chosen card: if nobody clicks, Oncure; click
 * Awards and they show awards only, and so on. Everything here comes from his own material.
 */

export interface Stat {
  big: string;
  /** If set, the number counts up to this (any letters around it in `big` stay). */
  count?: number;
  label: string;
  source?: string;
}
export interface Step {
  title: string;
  line: string;
}
export interface Deep {
  stats: { kicker: string; head: string; items: Stat[]; note?: string };
  path: { kicker: string; head: string; steps: Step[]; note?: string };
  grid: { kicker: string; head: string; items: Step[]; roadmap?: Step[]; note?: string };
}

const TUTOR_TITLES = ['Exam prep', 'Homework help', 'Clear explanations', 'Math and Science', 'Group sessions', 'Feedback'];

export const DEEP: Record<string, Deep> = {
  oncure: {
    stats: {
      kicker: 'Oncure · the problem',
      head: 'Cancer treatment costs too much, takes too long and hurts too many.',
      items: [
        { big: '20M', count: 20, label: 'people diagnosed with cancer every year', source: 'World Health Organization' },
        { big: '10M', count: 10, label: 'deaths from cancer every year', source: 'IARC / GLOBOCAN' },
        { big: '6–8 mo', label: 'a standard chemotherapy regimen for late-stage lung cancer', source: 'American Cancer Society' },
        { big: '$100k+', count: 100, label: 'possible out-of-pocket cost, even with insurance', source: 'American Cancer Society' },
        { big: '15–25%', label: 'of people with cancer develop clinical depression', source: 'NIH / PubMed' },
      ],
      note: 'Figures from the sources in his proposal. Case and death counts are annual worldwide estimates.',
    },
    path: {
      kicker: 'Oncure · how it would work',
      head: 'Five steps, with a human check before any treatment.',
      steps: oncure.steps,
      note: 'A conceptual workflow. The full process has not been demonstrated as a working treatment.',
    },
    grid: {
      kicker: 'Oncure · honest about the hard parts',
      head: 'What has to be solved first.',
      items: oncure.challenges,
      roadmap: oncure.roadmap,
      note: oncure.disclaimer,
    },
  },
  trading: {
    stats: {
      kicker: 'AI trading app · the idea',
      head: 'Trading advice in plain words, right beside the chart.',
      items: [
        { big: 'AI', label: 'model suggests how much to buy, when to buy and an estimated time to sell' },
        { big: 'Real', label: 'world market data and algorithms behind every suggestion' },
        { big: 'No', label: 'candlestick patterns or equations to learn first' },
        { big: '2026', label: 'personal project, in progress' },
      ],
      note: 'Suggestions are hypothetical, not financial advice.',
    },
    path: {
      kicker: 'AI trading app · how it guides you',
      head: 'From a stock you like to a decision you understand.',
      steps: [
        { title: 'Open a stock', line: 'Look at any stock graph, as on a normal trading site.' },
        { title: 'AI reads the data', line: 'Real-world data and algorithms, worked through by the AI model.' },
        { title: 'Advice beside the graph', line: 'How much to buy, when to buy and an estimated time to sell.' },
        { title: 'Track it', line: 'Your dashboard shows each holding and its buy or sell stage.' },
        { title: 'Stay on top', line: 'Pending buys and sells, and top performers you may like.' },
      ],
      note: 'A concept in progress. Suggestions are hypothetical, not financial advice.',
    },
    grid: { kicker: 'AI trading app · features', head: 'Everything a trading site needs, made simpler.', items: stockApp.features },
  },
  tutoring: {
    stats: {
      kicker: 'Peer tutoring · at a glance',
      head: 'Helping younger students understand, one step at a time.',
      items: [
        { big: '7th–8th', label: 'grade students tutored' },
        { big: 'Math', label: 'and Science, his focus subjects' },
        { big: '1:1', label: 'and small-group sessions' },
        { big: 'Lunch', label: 'and after school, when students need it' },
      ],
    },
    path: {
      kicker: 'Peer tutoring · his method',
      head: 'How a tutoring session works.',
      steps: [
        { title: 'Find the gaps', line: 'Identify what is unclear and the skills to build.' },
        { title: 'Explain simply', line: 'Visual aids, diagrams and step-by-step explanations.' },
        { title: 'Practise together', line: 'Homework help and extra practice.' },
        { title: 'Prepare', line: 'Get ready for quizzes and exams.' },
        { title: 'Feedback', line: 'Build study habits, writing and critical thinking.' },
      ],
    },
    grid: {
      kicker: 'Peer tutoring · what he does',
      head: 'What his students get.',
      items: resume.tutoring.map((t, i) => ({ title: TUTOR_TITLES[i] ?? 'Tutoring', line: t })),
    },
  },
  awards: {
    stats: {
      kicker: 'Recognition · scores',
      head: 'Top percentiles, year after year.',
      items: [
        { big: '99th', count: 99, label: 'PSAT percentile, 8th grade' },
        { big: '98th', count: 98, label: 'PSAT percentile, 9th grade' },
        { big: '99th', count: 99, label: 'PSAT percentile, 10th grade' },
        { big: '99th', count: 99, label: 'MAP percentile, 10th grade (98th in 9th)' },
        { big: '1280', count: 1280, label: 'PSAT 8/9 score out of 1440, top 1% nationwide' },
      ],
    },
    path: {
      kicker: 'Recognition · over the years',
      head: 'From elementary school to high school.',
      steps: [
        { title: 'Project Arrow', line: 'Placed since 2nd grade, IPSD 204.' },
        { title: 'Mini-Medical School', line: 'Certificate of completion, 2021.' },
        { title: 'Young Authors', line: 'Contest winner, 2023.' },
        { title: 'Principal’s Honors', line: 'Fulton Science Academy, 2025 and 2026.' },
        { title: 'College Board NRP', line: 'National Recognition Program award recipient.' },
      ],
    },
    grid: { kicker: 'Recognition · every award', head: 'All his achievements.', items: achievements.map((a) => ({ title: a.title, line: a.detail })) },
  },
  writing: {
    stats: {
      kicker: 'Writing · at a glance',
      head: 'Words that win contests and back up research.',
      items: [
        { big: '2023', label: 'Young Authors Contest winner, IPSD 204' },
        { big: 'Honors', label: 'English Literature' },
        { big: '5', count: 5, label: 'kinds of sources in his Oncure research: WHO, IARC, NCI, NIH and the American Cancer Society' },
      ],
    },
    path: {
      kicker: 'Writing · his journey',
      head: 'From a contest win to a research proposal.',
      steps: [
        { title: 'Young Authors', line: 'Won the contest in 2023.' },
        { title: 'Honors English', line: 'Advanced literature in high school.' },
        { title: 'Oncure proposal', line: 'A sourced research proposal, 2026.' },
      ],
    },
    grid: {
      kicker: 'Writing · skills',
      head: 'What his writing covers.',
      items: [
        { title: 'Essay writing', line: 'Clear, structured essays.' },
        { title: 'Research writing', line: 'Arguments built on data and sources.' },
        { title: 'Source review', line: 'Scientific source review and citation.' },
        { title: 'Creative writing', line: 'One of his areas of interest.' },
      ],
    },
  },
  activities: {
    stats: {
      kicker: 'Beyond class · at a glance',
      head: 'Sport, music, competition and service.',
      items: [
        { big: '2021', label: 'started guitar, Atlanta Piano Fortissimo' },
        { big: '2025', label: 'started Muay Thai martial arts' },
        { big: 'Senior', label: 'Team member, Swim Atlanta' },
        { big: '3', count: 3, label: 'volunteering roles: TAMA Medical Camp, Sri Shirdi Sai Temple and peer tutoring' },
      ],
    },
    path: {
      kicker: 'Beyond class · timeline',
      head: 'A few years of trying new things.',
      steps: [
        { title: 'Guitar', line: '2021, Atlanta Piano Fortissimo.' },
        { title: 'Science Olympiad', line: 'Fulton Science Academy, 2024.' },
        { title: 'Muay Thai', line: 'Martial arts since 2025.' },
        { title: 'Science Olympiad', line: 'Again in 2025.' },
        { title: 'DECA', line: 'Fulton Science Academy, 2026.' },
      ],
    },
    grid: {
      kicker: 'Beyond class · everything',
      head: 'Activities and volunteering.',
      items: [...activities.map((a) => ({ title: a.title, line: a.role })), ...volunteering.map((v) => ({ title: v.title, line: v.role }))],
    },
  },
};
