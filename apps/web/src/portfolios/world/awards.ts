/**
 * Shreyas's awards and certificates, as shown above the clouds. Facts come from
 * content/portfolio.ts. Until scans of the originals are supplied (`scan`), each one is drawn as a
 * clearly labelled display replica: the real title, line and year, no logos or signatures.
 */

export interface Award {
  id: string;
  kind: 'certificate' | 'score' | 'program' | 'award' | 'honor';
  title: string;
  line: string;
  year?: string;
  detail: string;
  /** URL of a photo or scan of the original, when the family supplies one. */
  scan?: string;
  confirm?: string;
  accent: string;
}

export const AWARDS: Award[] = [
  {
    id: 'cbnrp',
    kind: 'award',
    title: 'College Board NRP',
    line: 'National Recognition Program',
    detail: 'Recipient of the College Board National Recognition Program award.',
    accent: '#2f5d8c',
  },
  {
    id: 'honors',
    kind: 'honor',
    title: 'Principal’s Honors List',
    line: 'Fulton Science Academy',
    year: '2025 · 26',
    detail: 'Named to the Principal’s Honors List at Fulton Science Academy in 2025 and 2026.',
    accent: '#b07a2a',
  },
  {
    id: 'psat',
    kind: 'score',
    title: 'PSAT',
    line: '99th percentile',
    detail: 'PSAT percentiles: 99th in 8th grade, 98th in 9th grade, 99th in 10th grade. PSAT 8/9 score: 1280 out of 1440.',
    accent: '#2f5d8c',
  },
  {
    id: 'map',
    kind: 'score',
    title: 'MAP',
    line: '99th percentile',
    detail: 'MAP percentiles: 98th in 9th grade, 99th in 10th grade.',
    accent: '#3f7d6a',
  },
  {
    id: 'arrow',
    kind: 'program',
    title: 'Project Arrow',
    line: 'IPSD 204 · since 2nd grade',
    detail: 'Placed in Project Arrow at Indian Prairie School District 204 since 2nd grade.',
    accent: '#6d5a8c',
  },
  {
    id: 'authors',
    kind: 'certificate',
    title: 'Young Authors Contest',
    line: 'Winner · District 204',
    year: '2023',
    detail: 'Winner of the Young Authors Contest in 2023 (Indian Prairie School District 204).',
    accent: '#c44d3f',
  },
  {
    id: 'medical',
    kind: 'certificate',
    title: 'Mini-Medical School',
    line: 'Certificate of completion',
    year: '2021',
    detail: 'Completed Mini-Medical School in 2021.',
    accent: '#3f7d6a',
  },
];

/** Draw an award as a framed certificate (or score report) into a canvas area of w × h. */
export function drawAward(g: CanvasRenderingContext2D, a: Award, w: number, h: number) {
  // Paper with a soft grain.
  g.fillStyle = '#fbf6ea';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = `rgba(150,120,80,${((i * 37) % 9) / 300})`;
    g.fillRect((i * 97) % w, (i * 53) % h, 2, 2);
  }
  // Ornate double border with corner rosettes.
  g.strokeStyle = a.accent;
  g.lineWidth = Math.max(4, w * 0.012);
  g.strokeRect(w * 0.04, h * 0.03, w * 0.92, h * 0.94);
  g.lineWidth = 1.5;
  g.strokeRect(w * 0.065, h * 0.05, w * 0.87, h * 0.9);
  for (const [cx, cy] of [[0.065, 0.05], [0.935, 0.05], [0.065, 0.95], [0.935, 0.95]] as const) {
    for (let r = 4; r < 22; r += 6) {
      g.beginPath();
      g.arc(cx * w, cy * h, (r * w) / 560, 0, Math.PI * 2);
      g.stroke();
    }
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const head = { score: 'SCORE REPORT', program: 'PROGRAM', award: 'AWARD', honor: 'HONOR ROLL', certificate: 'CERTIFICATE' }[a.kind];
  g.fillStyle = a.accent;
  g.font = `600 ${w * 0.04}px Georgia, serif`;
  g.fillText(head, w / 2, h * 0.13);
  g.fillStyle = '#8a7a66';
  g.font = `italic ${w * 0.032}px Georgia, serif`;
  g.fillText(a.kind === 'certificate' ? 'This is to recognise' : 'Awarded to', w / 2, h * 0.21);
  g.fillStyle = '#2d2620';
  g.font = `700 ${w * 0.07}px Georgia, serif`;
  g.fillText('Shreyas Ballari', w / 2, h * 0.3);
  g.strokeStyle = '#c9b89a';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(w * 0.2, h * 0.345);
  g.lineTo(w * 0.8, h * 0.345);
  g.stroke();
  g.fillStyle = a.accent;
  g.font = `700 ${w * 0.058}px Georgia, serif`;
  fit(g, a.title, w / 2, h * 0.43, w * 0.8, w * 0.058, 'Georgia, serif');
  g.fillStyle = '#5b5048';
  g.font = `400 ${w * 0.04}px Georgia, serif`;
  g.fillText(a.line, w / 2, h * 0.5);
  if (a.kind === 'score') {
    // A simple bar for the score, where a number is known.
    const m = /(\d+)\s*out of\s*(\d+)/.exec(a.line);
    const pct = /(\d+)th percentile/.exec(a.line);
    if (m || pct) {
      const frac = m ? Number(m[1]) / Number(m[2]) : Number(pct![1]) / 100;
      g.fillStyle = '#e8e0d0';
      g.fillRect(w * 0.2, h * 0.57, w * 0.6, h * 0.025);
      g.fillStyle = a.accent;
      g.fillRect(w * 0.2, h * 0.57, w * 0.6 * frac, h * 0.025);
    }
  }
  // Gold seal with ribbons.
  const sx = w * 0.5;
  const sy = h * 0.72;
  const sr = w * 0.085;
  g.fillStyle = a.accent;
  g.beginPath();
  g.moveTo(sx - sr * 0.6, sy);
  g.lineTo(sx - sr * 0.9, sy + sr * 1.9);
  g.lineTo(sx - sr * 0.4, sy + sr * 1.55);
  g.lineTo(sx - sr * 0.1, sy + sr * 1.95);
  g.lineTo(sx + sr * 0.1, sy);
  g.fill();
  g.beginPath();
  g.moveTo(sx + sr * 0.6, sy);
  g.lineTo(sx + sr * 0.9, sy + sr * 1.9);
  g.lineTo(sx + sr * 0.4, sy + sr * 1.55);
  g.lineTo(sx + sr * 0.1, sy + sr * 1.95);
  g.lineTo(sx - sr * 0.1, sy);
  g.fill();
  const seal = g.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, sr * 0.1, sx, sy, sr);
  seal.addColorStop(0, '#fff1b8');
  seal.addColorStop(0.5, '#e0b04a');
  seal.addColorStop(1, '#a6782a');
  g.fillStyle = seal;
  g.beginPath();
  for (let i = 0; i <= 32; i++) {
    const ang = (i / 32) * Math.PI * 2;
    const r = sr * (i % 2 ? 0.92 : 1);
    g.lineTo(sx + Math.cos(ang) * r, sy + Math.sin(ang) * r);
  }
  g.fill();
  g.fillStyle = '#7a5a20';
  g.font = `700 ${w * 0.034}px Georgia, serif`;
  g.fillText(a.year ?? '★', sx, sy + 2);
  // Blank signature lines (no signatures are reproduced).
  g.strokeStyle = '#b9a98c';
  for (const x of [0.2, 0.62]) {
    g.beginPath();
    g.moveTo(w * x, h * 0.86);
    g.lineTo(w * (x + 0.18), h * 0.86);
    g.stroke();
  }
  g.fillStyle = '#a8977a';
  g.font = `400 ${w * 0.022}px Georgia, serif`;
  g.fillText(a.scan ? '' : 'Display replica · original to be supplied', w / 2, h * 0.92);
}

function fit(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, size: number, family: string) {
  let s = size;
  g.font = `700 ${s}px ${family}`;
  while (g.measureText(text).width > max && s > 10) {
    s -= 2;
    g.font = `700 ${s}px ${family}`;
  }
  g.fillText(text, x, y);
}

/** A data URL of the award drawing, for the on-screen viewer. */
export function awardImage(a: Award, w = 900, h = 1125) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  drawAward(c.getContext('2d')!, a, w, h);
  return c.toDataURL('image/png');
}
