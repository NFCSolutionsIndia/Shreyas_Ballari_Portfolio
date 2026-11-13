export const SITE = {
  name: 'Shreyas Ballari',
  tagline: 'Student Researcher & Peer Tutor',
} as const;

export const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/research', label: 'Research' },
  { to: '/projects', label: 'Projects' },
  { to: '/achievements', label: 'Achievements' },
  { to: '/tutoring', label: 'Tutoring' },
  { to: '/contact', label: 'Contact' },
] as const;
