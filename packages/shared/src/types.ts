export type Status = 'draft' | 'published';

export interface Media {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  mimeType: string;
}

export interface Profile {
  fullName: string;
  headline: string;
  shortBio: string;
  longBio: string; // sanitised HTML from TipTap
  photo: Media;
  location: string; // city/state only — never a street address
  school: string;
  gradYear?: number;
  resumePdf?: Media;
  socials: { label: string; url: string }[];
}

export interface Research {
  id: string;
  slug: string;
  title: string;
  summary: string;
  stage: 'concept' | 'in-progress' | 'published';
  year: number;
  fields: string[];
  body: string;
  workflow: { step: number; title: string; description: string }[];
  challenges: { title: string; detail: string }[];
  roadmap: string[];
  sources: { label: string; url: string }[];
  coverImage?: Media;
  pdf?: Media;
  status: Status;
  order: number;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  stage: 'idea' | 'in-progress' | 'launched';
  techStack: string[];
  features: string[];
  screenshots: Media[];
  repoUrl?: string;
  demoUrl?: string;
  startDate?: string;
  endDate?: string;
  status: Status;
  order: number;
}

export interface Achievement {
  id: string;
  type: 'award' | 'score' | 'certificate' | 'program';
  title: string;
  issuer?: string;
  date?: string; // ISO "2023" or "2021-07-25"
  detail?: string;
  proof?: Media;
  status: Status;
  order: number;
}

export interface Education {
  id: string;
  school: string;
  level: 'elementary' | 'middle' | 'high';
  city: string;
  state: string;
  startYear?: number;
  endYear?: number;
  notes?: string;
  order: number;
}

export interface Experience {
  id: string;
  role: string;
  org?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  bullets: string[];
  order: number;
}

export interface SkillGroup {
  id: string;
  name: string;
  skills: string[];
  order: number;
}

export interface Testimonial {
  id: string;
  quote: string;
  authorName: string;
  authorRole: string;
  consentGiven: boolean;
  status: Status;
}
