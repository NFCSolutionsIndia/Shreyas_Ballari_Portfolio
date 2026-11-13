import { describe, expect, it } from 'vitest';
import { ABOUT, buildSequence, KEYS, keysFor, plain } from '@/portfolios/classic/about/typing';

describe('About me keyboard typing', () => {
  const blocks = [ABOUT.heading, ...ABOUT.paragraphs].map(plain);
  const seq = buildSequence(blocks);
  const ids = new Set(KEYS.map((k) => k.id));

  it('presses a real key for every character', () => {
    for (const s of seq) expect(ids.has(s.key), `${JSON.stringify(s.ch)} -> ${s.key}`).toBe(true);
  });

  it('types exactly the content, character by character, in order', () => {
    const out = blocks.map(() => '');
    for (const s of seq) if (s.ch !== '\n') out[s.block] += s.ch;
    expect(out).toEqual(blocks);
    expect(seq.filter((s) => s.ch === '\n')).toHaveLength(blocks.length - 1);
  });

  it('uses Shift for capitals and shifted punctuation only', () => {
    expect(keysFor('H')).toEqual({ key: 'H', shift: true });
    expect(keysFor('h')).toEqual({ key: 'H', shift: false });
    expect(keysFor(',')).toEqual({ key: ',', shift: false });
    expect(keysFor('?')).toEqual({ key: '/', shift: true });
    expect(keysFor(' ')).toEqual({ key: 'Space', shift: false });
    for (const s of seq) expect(s.shift).toBe(/[A-Z!@#$%^&*()_+{}|:"<>?]/.test(s.ch));
  });
});
