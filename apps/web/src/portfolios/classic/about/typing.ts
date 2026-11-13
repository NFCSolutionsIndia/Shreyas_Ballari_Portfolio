/**
 * The keyboard and its typing: one layout (a tenkeyless board, as in the reference), one character-to-key
 * map, and one sequence that drives both the 3D keys and the text on screen, so every character
 * that appears is the key that went down.
 */

// --- Content (edit the words here; plain ASCII so every character has a key) ---------------

/**
 * The words. `{name}` drops an animated icon in after the word before it (see ICONS in
 * AboutKeys); icons are not typed, they pop in as soon as the text before them is.
 */
export const ABOUT = {
  heading: 'Hi, I am {photo}Shreyas{peace}.',
  paragraphs: [
    'A junior at Fulton Science Academy{school} who loves computer science{code}, AI{ai}, business{chart} and FinTech{fintech}.',
    'I research how AI can help in oncology{dna}, and I am building an AI stock trading app{app} that helps beginners invest.',
    'I code in JavaScript{js}, Python{py} and Java{java}. Outside class I swim{swim} with the Swim Atlanta Senior Team, train in Muay Thai{fist} and play guitar{guitar}.',
    'One day I want to head AI engineering and development at NFC{lead}, and set up a world-class AI lab for cancer research{lab}.',
  ],
};

/** `glue`: punctuation right after an icon, kept on the same line as it. */
export type Segment = { kind: 'text'; text: string; start: number; glue?: boolean } | { kind: 'icon'; name: string; at: number };

/** Split a line into text and icon segments; `start`/`at` are positions in the typed text. */
export function segments(line: string): Segment[] {
  const out: Segment[] = [];
  let pos = 0;
  for (const part of line.split(/(\{[a-z]+\})/)) {
    if (!part) continue;
    const m = part.match(/^\{([a-z]+)\}$/);
    if (m) out.push({ kind: 'icon', name: m[1]!, at: pos });
    else {
      // Punctuation straight after an icon stays with it (no line break between them).
      const lead = out[out.length - 1]?.kind === 'icon' ? (part.match(/^[.,;:!?]+/)?.[0] ?? '') : '';
      if (lead) {
        out.push({ kind: 'text', text: lead, start: pos, glue: true });
        pos += lead.length;
      }
      const rest = part.slice(lead.length);
      if (rest) {
        out.push({ kind: 'text', text: rest, start: pos });
        pos += rest.length;
      }
    }
  }
  return out;
}

/** The line as typed (icon markers removed). */
export const plain = (line: string) => line.replace(/\{[a-z]+\}/g, '');

export { BOARD_D, BOARD_W, KEYS, KNOB, type KeyDef } from './keyboard/layout';
export { pressed } from './keyboard/controller';

// --- Characters to keys ----------------------------------------------------------------------

const SHIFTED: Record<string, string> = { '~': '`', '!': '1', '@': '2', '#': '3', $: '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0', _: '-', '+': '=', '{': '[', '}': ']', '|': '\\', ':': ';', '"': "'", '<': ',', '>': '.', '?': '/' };
const PLAIN = new Set(['`', '-', '=', '[', ']', '\\', ';', "'", ',', '.', '/']);

/** The keys one character needs: Shift (if any) and the key itself. */
export function keysFor(ch: string): { key: string; shift: boolean } {
  if (ch === ' ') return { key: 'Space', shift: false };
  if (ch === '\n') return { key: 'Enter', shift: false };
  if (/[a-z]/.test(ch)) return { key: ch.toUpperCase(), shift: false };
  if (/[A-Z]/.test(ch)) return { key: ch, shift: true };
  if (/[0-9]/.test(ch) || PLAIN.has(ch)) return { key: ch, shift: false };
  const base = SHIFTED[ch];
  if (base) return { key: base, shift: true };
  throw new Error(`No key for character ${JSON.stringify(ch)}`);
}

export interface Stroke {
  /** Index of the text block (0 = heading) and character position inside it. */
  block: number;
  pos: number;
  ch: string;
  key: string;
  shift: boolean;
  /** Pause before this stroke, ms. */
  wait: number;
}

/** Every keystroke in order: the heading, then each paragraph after a Return. */
export function buildSequence(blocks: string[]): Stroke[] {
  const out: Stroke[] = [];
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  blocks.forEach((text, block) => {
    if (block > 0) out.push({ block, pos: -1, ch: '\n', key: 'Enter', shift: false, wait: 260 });
    [...text].forEach((ch, pos) => {
      const k = keysFor(ch);
      const prev = text[pos - 1] ?? '';
      // Human rhythm: quicker inside words, a beat after punctuation and between words.
      let wait = 34 + rnd() * 38;
      if (ch === ' ') wait += 18;
      if (/[.,!?]/.test(prev)) wait += 140;
      if (k.shift) wait += 40;
      out.push({ block, pos, ch, key: k.key, shift: k.shift, wait });
    });
  });
  return out;
}

