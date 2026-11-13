/**
 * All words in "My World" live here, away from the 3D scene code. Facts come from
 * content/portfolio.ts and from the family; anything not supplied yet is marked so.
 *
 * Public details approved by the family for this tab: city and state (no ZIP or street address),
 * Shreyas's name, photo and phone number. Email and links are still to be supplied.
 */

import {
  activities,
  courses,
  findCluster,
  goals,
  interests,
  languages,
  profile,
  researchInterests,
  schools,
  stockApp,
  subjects,
  volunteering,
} from '@/content/portfolio';

const text = (id: string, i = 0) => findCluster(id)?.body[i]?.text ?? '';

export const WORLD = {
  name: profile.name,
  firstName: profile.firstName,
  title: 'Student researcher',
  tagline: 'Every moment has a story',
  motto: 'Curiosity has no limits.',
  location: 'Cumming, Georgia',
  grade: profile.grade,
  school: profile.school,
  schoolTown: profile.schoolTown,
  portrait: profile.portrait,
  about: [text('about'), text('about', 1)],
  /** His path so far (oldest first). */
  schools: schools.map((s) => s.name),
  interests,
  subjects,
  researchInterests,
  courses,
  languages,
  volunteering,
  activities,
  goals,
  /** What he does (verified). */
  roles: ['Independent researcher', 'App builder', 'Peer tutor', 'Writer'],
  tutoring: [text('tutoring'), text('tutoring', 1)],
  /** Shown one by one along the road (verified subjects, research and skills). */
  fields: ['Computer Science', 'Artificial Intelligence', 'Business & FinTech', 'AI in oncology', 'JavaScript · Python · Java', 'Peer tutoring'],
  projects: [
    {
      id: 'oncure',
      title: 'Oncure',
      category: 'Research concept',
      intro: 'AI-guided nanobot cancer therapy: a concept, not a cure.',
      details: [text('oncure'), text('oncure', 1)],
      missing: 'Objectives, the workflow from the proposal, findings and charts.',
      link: { to: '/research/oncure', label: 'Read the Oncure page' },
    },
    {
      id: 'finance',
      title: stockApp.name,
      category: stockApp.status,
      intro: 'Beginner friendly, welcoming to veterans: an AI model suggests how much to buy, when to buy and when to sell.',
      details: [stockApp.summary, ...stockApp.features.map((f) => `${f.title}: ${f.line}`)],
      missing: 'Screens of the app and the technologies used.',
      link: { to: '/projects/stock-trading-app', label: 'See the project' },
    },
    {
      id: 'tutoring',
      title: 'Peer tutoring',
      category: 'Teaching',
      intro: 'Tutored 7th and 8th grade students in Math and Science.',
      details: [text('tutoring'), text('tutoring', 1)],
      missing: '',
      link: { to: '/', label: '' },
    },
  ],
  contact: {
    heading: 'Say hello',
    name: profile.name,
    phone: '415-581-5887',
    /** Not supplied yet: shown as "To be supplied". */
    email: '',
    links: [] as { label: string; url: string }[],
    line: text('contact'),
  },
  /** The place shown in the corner for each part of the journey. */
  places: {
    lake: 'Lakeside · Cumming, Georgia',
    downtown: 'Historic downtown · Cumming',
    schools: 'School road · my schools',
    work: 'Entering · my work',
    projects: 'Roadside cinema · my projects',
    statue: 'The golden scholar',
    sky: 'Above the clouds · recognition',
    dive: 'Skydive into the next chapter',
    touch: 'Get in touch city',
    room: 'Shreyas’s room',
  },
};
