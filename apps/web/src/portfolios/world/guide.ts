import { AWARDS } from './awards';
import { WORLD } from './data/worldData';
import { RIDE, STOPS } from './three/path';

/**
 * The on-screen guide: answers questions about Shreyas from the verified facts on this site and
 * understands simple navigation ("take me to his projects"). It runs entirely in the browser:
 * no data leaves the page and nothing is made up; unknown answers say so.
 */

const rideStop = (t: number) => STOPS.ride + t * (STOPS.rideEnd - STOPS.ride);

export const PLACES = {
  home: { stop: STOPS.home, label: 'the lake' },
  welcome: { stop: STOPS.welcome, label: 'the bridge' },
  about: { stop: STOPS.about, label: 'About me' },
  schools: { stop: rideStop(RIDE.schools[0]! - 0.02), label: 'his schools' },
  work: { stop: rideStop(RIDE.sign - 0.04), label: 'My work' },
  oncure: { stop: rideStop(RIDE.oncure - 0.03), label: 'the Oncure screen' },
  stocks: { stop: rideStop(RIDE.stocks - 0.03), label: 'the stock app screen' },
  tutoring: { stop: rideStop(RIDE.tutoring - 0.03), label: 'the peer tutoring screen' },
  statue: { stop: STOPS.statue + 0.01, label: 'the golden statue' },
  awards: { stop: STOPS.awards, label: 'awards and certificates' },
  skydive: { stop: STOPS.fall + 0.01, label: 'the skydive' },
  contact: { stop: STOPS.contact, label: 'Get in touch' },
  room: { stop: STOPS.end, label: 'his room' },
} as const;

export type PlaceKey = keyof typeof PLACES;

export interface Reply {
  text: string;
  go?: PlaceKey;
  open?: string;
}

const NAV = /\b(go|take|bring|jump|show|open|navigate|move|fly|head|skip|visit)\b/;

const TOPICS: { key: PlaceKey; words: RegExp }[] = [
  { key: 'home', words: /\b(home|start|beginning|lake|top)\b/ },
  { key: 'about', words: /\b(about|who is|introduc)/ },
  { key: 'schools', words: /\b(school|schools|elementary|middle|academy|fulton)\b/ },
  { key: 'work', words: /\b(work|skills|fields)\b/ },
  { key: 'oncure', words: /\b(oncure|research|nanobot|cancer)\b/ },
  { key: 'stocks', words: /\b(stock|trading|finance|app)\b/ },
  { key: 'statue', words: /\b(statue)\b/ },
  { key: 'awards', words: /\b(award|awards|certificate|certificates|psat|young authors|mini.?medical|achievement)/ },
  { key: 'skydive', words: /\b(skydive|parachute|jump)\b/ },
  { key: 'contact', words: /\b(contact|touch|phone|call|email|message)\b/ },
  { key: 'room', words: /\b(room|bedroom|study|desk)\b/ },
];

function facts(key: PlaceKey): string {
  switch (key) {
    case 'about':
      return `${WORLD.name} is a ${WORLD.grade.toLowerCase()} at ${WORLD.school} in ${WORLD.schoolTown}. He loves ${WORLD.subjects.join(', ')}, and his research interests are ${WORLD.researchInterests.map((r) => r.title).join(' and ')}.`;
    case 'schools':
      return `His path so far: ${WORLD.schools.join(', then ')} (where he studies now).`;
    case 'work':
      return `His fields: ${WORLD.fields.join(', ')}.`;
    case 'oncure':
      return 'Oncure is his research concept for AI-guided nanobot cancer therapy: tiny nanobots carry medicine, artificial intelligence guides them to tumour cells, and the medicine is released only there so healthy tissue is spared. It is a concept, not a cure. The workflow and findings from the proposal are still to be supplied.';
    case 'stocks':
      return 'He is building a beginner-friendly stock trading website. An AI model uses real-world data and algorithms to suggest how much of a stock to buy, when to buy it and an estimated time to sell, right next to the stock graph. It also has a dashboard of holdings and their buy or sell stage, pending orders, top performers and AI-powered calculators. It is in progress.';
    case 'awards':
      return `Recognition: ${AWARDS.map((a) => `${a.title} (${a.line}${a.year ? `, ${a.year}` : ''})`).join('; ')}.`;
    case 'contact':
      return `You can reach ${WORLD.firstName} by phone at ${WORLD.contact.phone}, or leave a message at the Get in touch square. An email address is still to be supplied.`;
    case 'statue':
      return 'The golden scholar holds a laurel wreath up to the sky. The plinth reads “Curiosity has no limits”.';
    case 'room':
      return 'His room holds his certificates, the Oncure poster, a pinboard of his schools, the stock app on his laptop, a microscope and his books.';
    default:
      return '';
  }
}

export function answer(input: string): Reply {
  const q = input.toLowerCase().trim();
  if (!q) return { text: 'Ask me anything about Shreyas, or say “take me to his projects”.' };
  if (/^(hi|hello|hey|good (morning|evening|afternoon))\b/.test(q))
    return { text: `Hi! I’m the guide to ${WORLD.firstName}’s world. Ask about his school, Oncure, his awards, or say “take me to the awards”.` };
  if (/\b(help|what can you do|commands)\b/.test(q))
    return {
      text: 'Try: “Who is Shreyas?”, “What is Oncure?”, “Show his awards”, “Take me to contact”, “Next”, “Back”, “Night mode”, “Sound off”.',
    };
  const topic = TOPICS.find((t) => t.words.test(q));
  if (NAV.test(q) && topic) {
    const place = PLACES[topic.key];
    const extra = topic.key === 'oncure' ? { open: 'oncure' } : {};
    return { text: `Taking you to ${place.label}.`, go: topic.key, ...extra };
  }
  if (/\b(where|live|city|town|from)\b/.test(q)) return { text: `${WORLD.firstName} lives in ${WORLD.location}.` };
  if (/\b(tutor|teach)/.test(q)) return { text: `He is a peer tutor, one to one and in small groups. ${WORLD.tutoring[1] ?? ''}`.trim() };
  if (/\b(interest|hobb|like|enjoy|curious)/.test(q)) return { text: `He’s curious about ${WORLD.interests.join(', ')}.` };
  if (/\b(age|old|birthday|born)\b/.test(q)) return { text: 'That isn’t shared on this site.' };
  if (/\b(grade|year|junior)\b/.test(q)) return { text: `He is a ${WORLD.grade.toLowerCase()} at ${WORLD.school}.` };
  if (/\b(course|courses|class|classes|ap)\b/.test(q)) return { text: `Courses: ${WORLD.courses.join(', ')}.` };
  if (/\b(language|languages|code|coding|program|programming|python|java)\b/.test(q)) return { text: `He programs in ${WORLD.languages.join(', ')}.` };
  if (/\b(volunteer|volunteering|temple|camp)\b/.test(q)) return { text: `Volunteering: ${WORLD.volunteering.map((v) => `${v.role} (${v.title})`).join('; ')}.` };
  if (/\b(sport|sports|swim|swimming|muay|martial|guitar|music|olympiad|deca|activit)/.test(q)) return { text: `Activities: ${WORLD.activities.map((a) => `${a.title}, ${a.role}`).join('; ')}.` };
  if (/\b(goal|goals|future|college|university|career|dream)\b/.test(q)) return { text: `${WORLD.goals.education} Career goals: ${WORLD.goals.career.join(' ')}` };
  if (topic) return { text: facts(topic.key), go: undefined };
  return { text: 'I only know what’s on this site, and I don’t have that yet. Try asking about his school, Oncure, his awards or how to get in touch.' };
}
