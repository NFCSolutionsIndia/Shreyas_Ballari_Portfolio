// Converts font files into three.js typeface JSON (the format FontLoader/TextGeometry use),
// keeping only the characters the 3D lettering needs. Run: node scripts/make-typeface.mjs
// Equivalent to three's TTFLoader, but offline, so the site never fetches opentype.js from a CDN.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,'’!?&-—·/%";

const FONTS = [
  {
    source: '../node_modules/@fontsource/montserrat/files/montserrat-latin-900-italic.woff',
    out: '../src/features/desk/fonts/montserrat-black-italic.typeface.json',
  },
];

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

for (const { source, out } of FONTS) {
  const buf = readFileSync(here(source));
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const scale = 100000 / ((font.unitsPerEm || 2048) * 72);
  const r = (n) => Math.round(n * scale);

  const glyphs = {};
  for (const ch of new Set(CHARS)) {
    const glyph = font.charToGlyph(ch);
    if (!glyph || glyph.unicode === undefined) continue;
    const o = [];
    for (const cmd of glyph.path.commands) {
      const t = cmd.type.toLowerCase();
      if (t === 'c') o.push('b', r(cmd.x), r(cmd.y), r(cmd.x1), r(cmd.y1), r(cmd.x2), r(cmd.y2));
      else if (t === 'q') o.push('q', r(cmd.x), r(cmd.y), r(cmd.x1), r(cmd.y1));
      else if (t !== 'z') o.push(t, r(cmd.x), r(cmd.y));
    }
    const box = glyph.getBoundingBox();
    glyphs[ch] = { ha: r(glyph.advanceWidth), x_min: r(box.x1), x_max: r(box.x2), o: o.join(' ') };
  }

  const json = {
    glyphs,
    familyName: font.names.fontFamily?.en ?? 'font',
    ascender: r(font.ascender),
    descender: r(font.descender),
    underlinePosition: r(font.tables.post.underlinePosition),
    underlineThickness: r(font.tables.post.underlineThickness),
    boundingBox: {
      xMin: r(font.tables.head.xMin),
      yMin: r(font.tables.head.yMin),
      xMax: r(font.tables.head.xMax),
      yMax: r(font.tables.head.yMax),
    },
    resolution: 1000,
    original_font_information: font.tables.name,
  };

  writeFileSync(here(out), JSON.stringify(json));
  console.log(`wrote ${Object.keys(glyphs).length} glyphs to ${out}`);
}
