import { profile, schools } from '@/content/portfolio';
import type { Gesture } from './room/Avatar';
import type { PlaceId } from './places';

type Vec3 = [number, number, number];

export interface Beat {
  text: string;
  gesture: Gesture;
}

export interface Stop {
  /** Where Shreyas stands (x, z) at this stop. */
  at: [number, number];
  /** What he points at while saying `point` lines. */
  point?: Vec3;
  beats: Beat[];
  /** The page this stop opens, if any. */
  page?: Exclude<PlaceId, 'door' | 'room'>;
  pageLabel?: string;
}

const talk = (text: string): Beat => ({ text, gesture: 'talk' });
const point = (text: string): Beat => ({ text, gesture: 'point' });
const wave = (text: string): Beat => ({ text, gesture: 'wave' });

/**
 * What Shreyas says at each stop on the walk, from the door to the contact corner.
 * DRAFT wording around confirmed facts (src/content/portfolio.ts): Shreyas should approve or
 * rewrite it. Never add a fact here that isn't confirmed there.
 */
export const STORY: Record<PlaceId, Stop> = {
  door: {
    at: [0.85, 9.9],
    beats: [
      wave(`Hi, I’m ${profile.firstName}! Welcome to my room.`),
      talk('Scroll down and I’ll walk you through my research, my milestones and how I tutor.'),
    ],
  },
  room: {
    at: [1.5, 3.7],
    beats: [
      talk(`This is where I research, build and tutor. I’m a student at ${profile.school}.`),
      point('Each corner tells part of my story. Let me start with who I am.'),
    ],
  },
  research: {
    at: [-2.05, -6.3],
    point: [-3.6, 2.2, -7.45],
    beats: [
      point('Now my projects. This is Oncure, my research concept: AI-guided nanobots for cancer therapy.'),
      talk('The hologram above my desk shows how the idea is meant to work, in five steps.'),
      talk('It starts from real problems: cancer is a leading cause of death, and treatment can be expensive and hard on patients.'),
      talk('I’m also building a stock trading app. That one is still in progress.'),
    ],
    page: 'research',
    pageLabel: 'Open my projects',
  },
  about: {
    at: [1.15, -5.6],
    point: [2.4, 1.3, -6.4],
    beats: [
      talk(`I’m a high school student at ${profile.school} in ${profile.state}.`),
      talk('I learn by asking why, and then building something to find out.'),
      point('Psst: there’s a gift inside that crystal. Tap it.'),
    ],
    page: 'about',
    pageLabel: 'More about me',
  },
  achievements: {
    at: [5.4, 0.05],
    point: [6.9, 1.9, -1.6],
    beats: [
      point('These are my trophies and awards so far.'),
      talk('I won the Young Authors Contest in 2023, in Indian Prairie School District 204.'),
      talk('I scored 1280 out of 1440 on the PSAT 8/9, and completed Mini-Medical School in 2021.'),
    ],
    page: 'achievements',
    pageLabel: 'See all achievements',
  },
  journey: {
    at: [-4.6, 1.35],
    point: [-6.8, 1.4, -0.4],
    beats: [
      point(`My studies so far: ${schools[0]?.name}, then ${schools[1]?.name}.`),
      talk(`Now I’m at ${schools[2]?.name}, with Project Arrow and Honors and AP courses.`),
    ],
    page: 'journey',
    pageLabel: 'See my studies',
  },
  tutoring: {
    at: [-6.05, 2.95],
    point: [-6.9, 1.85, 4.3],
    beats: [
      talk('I’m a peer tutor, one-to-one and in small groups.'),
      point('I use visual aids and go step by step, until it clicks.'),
    ],
    page: 'tutoring',
    pageLabel: 'About my tutoring',
  },
  contact: {
    at: [3.7, 6.3],
    beats: [
      wave('Thanks for walking through my room with me!'),
      talk('Teachers, researchers, mentors and admissions teams can reach me through the contact form. My family reads it first.'),
    ],
    page: 'contact',
    pageLabel: 'Open the contact form',
  },
};
