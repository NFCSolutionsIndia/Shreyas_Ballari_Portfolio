import {
  Atom,
  Binoculars,
  Books,
  ChalkboardTeacher,
  ChartLineUp,
  Certificate,
  Code,
  DoorOpen,
  EnvelopeSimple,
  Exam,
  Flask,
  GraduationCap,
  House,
  type Icon,
  Lightbulb,
  Medal,
  NotePencil,
  PenNib,
  Planet,
  Student,
  Trophy,
  UserCircle,
  UsersThree,
  Virus,
} from '@phosphor-icons/react';
import { findCluster, profile, schools, stats, type Copy } from '@/content/portfolio';
import { PHOTOS, type Photo } from './photos';

/**
 * Places in Shreyas's room, in walking order. Scrolling walks from one to the next; the stepper,
 * room plan and hotspots all read from this list. Coordinates are in metres: the room spans
 * x −7…7, z −8…8 (door at z = +8), floor at y = 0.
 */
export type PlaceId =
  | 'door'
  | 'room'
  | 'research'
  | 'about'
  | 'achievements'
  | 'journey'
  | 'tutoring'
  | 'contact';

type Vec3 = [number, number, number];

export interface Place {
  id: PlaceId;
  name: string;
  /** Floating label in the room; omitted for the door and the overview. */
  hotspot?: { label: string; at: Vec3 };
  icon: Icon;
  camera: Vec3;
  look: Vec3;
  /** Position on the 2D room plan (x, z). */
  plan: [number, number];
}

export const PLACES: Place[] = [
  { id: 'door', icon: DoorOpen, name: 'Door', camera: [0, 1.6, 13.2], look: [0, 1.5, 7], plan: [0, 9.5] },
  { id: 'room', icon: House, name: 'Room', camera: [0, 1.7, 6.6], look: [0, 1.3, -6], plan: [0, 5.5] },
  {
    id: 'about',
    icon: UserCircle,
    name: 'About me',
    hotspot: { label: 'About me', at: [2.4, 2.6, -7.6] },
    camera: [2.4, 1.6, -3.2],
    look: [2.4, 1.6, -8],
    plan: [2.4, -6.4],
  },
  {
    id: 'journey',
    icon: GraduationCap,
    name: 'My studies',
    hotspot: { label: 'My studies', at: [-6.6, 2.5, -0.4] },
    camera: [-2.6, 1.6, -0.4],
    look: [-7, 1.4, -0.4],
    plan: [-6.3, -0.4],
  },
  {
    id: 'achievements',
    icon: Trophy,
    name: 'Achievements',
    hotspot: { label: 'Achievements', at: [6.6, 2.5, -1.5] },
    camera: [2.4, 1.6, -1.5],
    look: [7, 1.75, -1.5],
    plan: [6.3, -1.5],
  },
  {
    id: 'research',
    icon: Flask,
    name: 'Projects',
    hotspot: { label: 'Projects', at: [-4.6, 1.25, -6.85] },
    camera: [-3.1, 1.6, -3.0],
    look: [-3.5, 1.6, -7.6],
    plan: [-3.6, -6.4],
  },
  {
    id: 'tutoring',
    icon: ChalkboardTeacher,
    name: 'Tutoring',
    hotspot: { label: 'Tutoring', at: [-6.6, 2.4, 4.4] },
    camera: [-2.6, 1.6, 4.4],
    look: [-7, 1.6, 4.4],
    plan: [-6.3, 4.4],
  },
  {
    id: 'contact',
    icon: EnvelopeSimple,
    name: 'Contact',
    hotspot: { label: 'Let’s talk', at: [5.4, 1.7, 5.6] },
    camera: [2.2, 1.5, 3],
    look: [5.6, 0.9, 6],
    plan: [5.6, 6],
  },
];

export const placeIndex = (id: PlaceId) => PLACES.findIndex((p) => p.id === id);

/** One card on a place page. */
export interface Card {
  meta: string;
  title: string;
  text: Copy | string;
  href?: string;
  /** Palette for the soft glow behind the card's photo. */
  hue: [string, string, string];
  photo: Photo;
  icon: Icon;
  pending?: boolean;
}

export interface PlacePage {
  id: PlaceId;
  title: string;
  intro: string;
  filters?: string[];
  cards: Card[];
}

const c = (id: string) => findCluster(id);
const first = (id: string, i = 0) => c(id)?.body[i] ?? { text: '', status: 'placeholder' as const };

const CALM = {
  sand: ['#efe6da', '#d9c7b0', '#b89a7a'],
  sea: ['#e4eef2', '#a9c6d3', '#5d8aa3'],
  dusk: ['#f2e3e6', '#d7a9b5', '#8b6a8f'],
  sage: ['#e6ece2', '#b8c8ad', '#6e8a68'],
  stone: ['#ecebe7', '#c9c6be', '#8f8b82'],
  amber: ['#f6ead6', '#e6c08a', '#b8823c'],
} satisfies Record<string, [string, string, string]>;

export const PAGES: Record<Exclude<PlaceId, 'door' | 'room'>, PlacePage> = {
  research: {
    id: 'research',
    title: 'Projects',
    intro: 'Independent research and the projects it led to. Hover a card to preview it, open it to read more.',
    filters: ['All', 'Research', 'Project'],
    cards: [
      { meta: '01 · Research · Concept', title: 'Oncure', text: first('oncure'), href: '/research/oncure', hue: CALM.sea, photo: PHOTOS.cancerCell, icon: Virus },
      { meta: '02 · Research · Problem', title: 'Why it matters', text: first('oncure', 1), hue: CALM.dusk, photo: PHOTOS.cellsIllustration, icon: Lightbulb },
      { meta: '03 · Research · Method', title: 'Workflow & findings', text: first('oncure', 2), hue: CALM.stone, pending: true, photo: PHOTOS.beaker, icon: Atom },
      { meta: '04 · Project · In progress', title: 'Stock trading app', text: first('stocks'), href: '/projects/stock-trading-app', hue: CALM.amber, photo: PHOTOS.stockExchange, icon: ChartLineUp },
      { meta: '05 · Project · Details', title: 'Role & technology', text: first('stocks', 1), hue: CALM.sand, pending: true, photo: PHOTOS.code, icon: Code },
    ],
  },
  about: {
    id: 'about',
    title: 'About me',
    intro: `${profile.name}, a student researcher at ${profile.school} in ${profile.state}.`,
    cards: (c('about')?.body ?? []).map((copy, i) => ({
      meta: `0${i + 1} · About`,
      title: ['Who I am', 'How I learn', 'In my own words'][i] ?? 'About',
      text: copy,
      hue: [CALM.sand, CALM.sea, CALM.sage][i] ?? CALM.stone,
      photo: [PHOTOS.telescope, PHOTOS.openBook, PHOTOS.notes][i] ?? PHOTOS.openBook,
      icon: [Binoculars, Books, PenNib][i] ?? Books,
      pending: copy.status === 'placeholder',
    })),
  },
  achievements: {
    id: 'achievements',
    title: 'Achievements',
    intro: 'Scores, awards, certificates and programs so far.',
    filters: ['All', 'Awards', 'Scores', 'Programs'],
    cards: [
      // Categories line up with the filter chips (Scores, Awards, Programs).
      ...stats.map((s, i) => ({
        meta: `0${i + 1} · ${['Scores', 'Awards', 'Awards', 'Scores'][i] ?? 'Awards'}${s.confirm ? ' · to confirm' : ''}`,
        title: `${s.value}${s.suffix ?? ''}`,
        text: s.label,
        hue: [CALM.amber, CALM.dusk, CALM.sage, CALM.sea][i] ?? CALM.stone,
        pending: !!s.confirm,
        photo: [PHOTOS.desk, PHOTOS.handsBook, PHOTOS.testTube, PHOTOS.mathBoard][i] ?? PHOTOS.papers,
        icon: [Exam, Medal, Certificate, ChartLineUp][i] ?? Medal,
      })),
      {
        meta: '05 · Programs',
        title: 'Project Arrow',
        text: 'Plus Honors and AP courses.',
        hue: CALM.stone,
        photo: PHOTOS.galaxy,
        icon: Planet,
      },
    ],
  },
  journey: {
    id: 'journey',
    title: 'My studies',
    intro: 'Three schools so far. Dates are still to be confirmed.',
    cards: schools.map((s, i) => ({
      meta: `0${i + 1} · ${s.level}`,
      title: s.name,
      text: { text: 'Dates to be confirmed.', status: 'placeholder' as const },
      hue: [CALM.sage, CALM.sea, CALM.sand][i] ?? CALM.stone,
      photo: [PHOTOS.chalkboardRoom, PHOTOS.classroomRows, PHOTOS.computerRoom][i] ?? PHOTOS.classroom,
      icon: [Student, Student, GraduationCap][i] ?? Student,
    })),
  },
  tutoring: {
    id: 'tutoring',
    title: 'Tutoring',
    intro: 'Peer tutoring, one to one and in small groups.',
    cards: (c('tutoring')?.body ?? []).map((copy, i) => ({
      meta: `0${i + 1} · Tutoring`,
      title: ['Format', 'Approach', 'Subjects'][i] ?? 'Tutoring',
      text: copy,
      hue: [CALM.sea, CALM.sand, CALM.stone][i] ?? CALM.stone,
      photo: [PHOTOS.classroom, PHOTOS.reading, PHOTOS.papers][i] ?? PHOTOS.classroom,
      icon: [UsersThree, NotePencil, Books][i] ?? Books,
      pending: copy.status === 'placeholder',
    })),
  },
  contact: {
    id: 'contact',
    title: 'Let’s talk',
    intro: c('contact')?.body[0]?.text ?? '',
    cards: [
      {
        meta: '01 · Contact',
        title: 'Contact form',
        text: c('contact')?.body[1] ?? '',
        href: '/contact',
        hue: CALM.dusk,
        photo: PHOTOS.letter,
        icon: EnvelopeSimple,
      },
    ],
  },
};
