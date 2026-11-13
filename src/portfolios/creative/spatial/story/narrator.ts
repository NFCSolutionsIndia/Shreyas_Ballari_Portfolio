/**
 * The narrator: reads each chapter aloud with the browser's own speech synthesis (no audio is
 * sent anywhere). It prefers a natural-sounding male English voice when the browser has one, reports
 * the word being spoken (for captions), and tells the story engine when it has finished so the
 * tour can move on by itself. Browsers only allow speech after the visitor has interacted.
 */

export interface SpeakHandlers {
  onWord?: (charIndex: number) => void;
  onEnd?: () => void;
}

let voice: SpeechSynthesisVoice | null = null;
let current: SpeechSynthesisUtterance | null = null;
let token = 0;

export const narratorSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

// Known male English voices across Windows, Chrome, macOS, iOS and Android.
const MALE = ['guy', 'davis', 'andrew', 'brian', 'christopher', 'eric', 'roger', 'steffan', 'tony', 'jason', 'ryan', 'thomas', 'william', 'liam', 'david', 'mark', 'george', 'james', 'richard', 'sean', 'google uk english male', 'daniel', 'alex', 'aaron', 'arthur', 'fred', 'tom', 'oliver', 'gordon', 'rishi', 'male'];
const FEMALE = ['female', 'aria', 'jenny', 'zira', 'samantha', 'susan', 'hazel', 'karen', 'moira', 'tessa', 'victoria', 'ava', 'allison', 'emma', 'michelle', 'sonia', 'libby', 'natasha', 'clara', 'google us english'];

/** True when the chosen voice is a known male voice (otherwise the pitch is lowered a little). */
let male = false;

function pickVoice() {
  if (!narratorSupported()) return null;
  const vs = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  const isMale = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase();
    return MALE.some((m) => n.includes(m)) && !FEMALE.some((f) => n.includes(f));
  };
  const rank = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase();
    let s = 0;
    if (isMale(v)) s += 20;
    if (n.includes('natural') || n.includes('neural') || n.includes('online')) s += 6;
    if (n.includes('guy') || n.includes('andrew') || n.includes('davis') || n.includes('google uk english male')) s += 3;
    if (v.lang === 'en-US') s += 2;
    if (v.localService) s += 1;
    return s;
  };
  const best = vs.sort((a, b) => rank(b) - rank(a))[0] ?? null;
  male = !!best && isMale(best);
  return best;
}

if (narratorSupported()) {
  window.speechSynthesis.onvoiceschanged = () => {
    voice = pickVoice();
  };
}

export function speak(text: string, h: SpeakHandlers = {}) {
  if (!narratorSupported()) {
    h.onEnd?.();
    return;
  }
  stopSpeaking();
  const my = ++token;
  voice ??= pickVoice();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  // A deeper delivery when the browser only offers a female or neutral voice.
  u.pitch = male ? 0.95 : 0.7;
  u.rate = male ? 1.0 : 0.96;
  u.onboundary = (e) => {
    if (my === token && e.name === 'word') h.onWord?.(e.charIndex);
  };
  u.onend = () => {
    if (my === token) h.onEnd?.();
  };
  u.onerror = () => {
    if (my === token) h.onEnd?.();
  };
  current = u;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  token++;
  if (narratorSupported()) window.speechSynthesis.cancel();
  current = null;
}

export const speaking = () => !!current && narratorSupported() && window.speechSynthesis.speaking;
