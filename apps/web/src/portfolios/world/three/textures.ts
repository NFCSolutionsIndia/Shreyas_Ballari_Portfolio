import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

/** Textures drawn in code for the stylised town (no image downloads needed). */

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

function tex(c: HTMLCanvasElement, repeat = false) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** A facade bay: plaster wall with one tall window, frame, sill and a slight shadow. */
export function facadeTexture(wall: string, glass: string) {
  const { c, g } = canvas(128, 128);
  g.fillStyle = wall;
  g.fillRect(0, 0, 128, 128);
  // Soft vertical weathering.
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.06)');
  grad.addColorStop(1, 'rgba(0,0,0,0.08)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  // Window frame, glass, mullion and sill.
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(36, 22, 56, 82);
  g.fillStyle = glass;
  g.fillRect(42, 28, 44, 70);
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.fillRect(42, 28, 44, 10);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(62, 28, 4, 70);
  g.fillStyle = 'rgba(255,255,255,0.4)';
  g.fillRect(32, 104, 64, 6);
  // Floor band.
  g.fillStyle = 'rgba(0,0,0,0.06)';
  g.fillRect(0, 122, 128, 6);
  return tex(c, true);
}

/** Embankment stone: staggered blocks. */
export function stoneTexture() {
  const { c, g } = canvas(256, 256);
  g.fillStyle = '#e2b39d';
  g.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) {
    const off = row % 2 ? 32 : 0;
    for (let col = -1; col < 5; col++) {
      const x = col * 64 + off;
      const y = row * 32;
      const shade = 0.92 + ((row * 7 + col * 13) % 9) / 90;
      g.fillStyle = `rgba(${Math.round(226 * shade)},${Math.round(179 * shade)},${Math.round(157 * shade)},1)`;
      g.fillRect(x + 2, y + 2, 60, 28);
    }
  }
  return tex(c, true);
}

/** Paving for the walkways and the square. */
export function pavingTexture() {
  const { c, g } = canvas(256, 256);
  g.fillStyle = '#e8c2ad';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(150,95,80,0.18)';
  g.lineWidth = 2;
  for (let i = 0; i <= 256; i += 32) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 256);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i);
    g.lineTo(256, i);
    g.stroke();
  }
  return tex(c, true);
}

/** Clock face with the visitor's real time (redrawn each minute). */
export function clockTexture(now = new Date()) {
  const { c, g } = canvas(512, 512);
  g.translate(256, 256);
  g.fillStyle = '#fbefe3';
  g.beginPath();
  g.arc(0, 0, 240, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 16;
  g.strokeStyle = '#7a4b3a';
  g.stroke();
  g.fillStyle = '#5c3528';
  g.font = '600 52px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const roman = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  roman.forEach((r, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    g.fillText(r, Math.cos(a) * 180, Math.sin(a) * 180);
  });
  const h = now.getHours() % 12;
  const m = now.getMinutes();
  const hand = (angle: number, len: number, width: number) => {
    g.save();
    g.rotate(angle);
    g.fillStyle = '#3d2219';
    g.fillRect(-width / 2, -len, width, len + 20);
    g.restore();
  };
  hand(((h + m / 60) / 12) * Math.PI * 2, 110, 16);
  hand((m / 60) * Math.PI * 2, 170, 10);
  g.beginPath();
  g.arc(0, 0, 16, 0, Math.PI * 2);
  g.fill();
  return tex(c);
}

/** Calendar drum under the clock: today's month and day, like a giant desk calendar. */
export function calendarTexture(now = new Date()) {
  const { c, g } = canvas(512, 256);
  g.fillStyle = '#fbefe3';
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#c44d3f';
  g.fillRect(0, 0, 512, 70);
  g.fillStyle = '#fff';
  g.font = '700 50px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(now.toLocaleString('en', { month: 'long' }).toUpperCase(), 256, 37);
  g.fillStyle = '#3d2219';
  g.font = '700 150px Georgia, serif';
  g.fillText(String(now.getDate()), 256, 168);
  return tex(c);
}

/** Thin wide title text for the sky, drawn with the page's web fonts. */
export function titleTexture(title: string, sub: string) {
  const { c, g } = canvas(2048, 512);
  g.clearRect(0, 0, 2048, 512);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,248,240,0.95)';
  g.shadowColor = 'rgba(120,60,60,0.35)';
  g.shadowBlur = 18;
  g.font = '400 150px "Michroma", "Space Mono", sans-serif';
  g.fillText(title, 1024, 210);
  g.shadowBlur = 8;
  g.font = '400 54px "Michroma", "Space Mono", sans-serif';
  const spaced = sub.toLowerCase().split('').join('  ');
  g.fillStyle = 'rgba(255,248,240,0.8)';
  g.fillText(spaced, 1024, 370);
  return tex(c);
}

/** Red-brick storefront bay (historic downtown): brick courses, white-trimmed window, lintel. */
export function brickFacadeTexture() {
  const { c, g } = canvas(128, 128);
  g.fillStyle = '#a5503f';
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) {
    const off = (y / 8) % 2 ? 8 : 0;
    for (let x = -16; x < 128; x += 16) {
      const k = 0.88 + (((x * 7 + y * 13 + 400) % 11) / 11) * 0.2;
      g.fillStyle = `rgb(${Math.round(176 * k)},${Math.round(86 * k)},${Math.round(66 * k)})`;
      g.fillRect(x + off + 1, y + 1, 14, 6);
    }
  }
  g.fillStyle = '#f4ede2';
  g.fillRect(34, 18, 60, 84);
  g.fillStyle = '#3d4a63';
  g.fillRect(40, 24, 48, 72);
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.fillRect(40, 24, 48, 12);
  g.fillStyle = '#f4ede2';
  g.fillRect(62, 24, 4, 72);
  g.fillRect(40, 58, 48, 3);
  g.fillRect(28, 12, 72, 7);
  g.fillRect(30, 102, 68, 5);
  return tex(c, true);
}

/** Painted lettering for the water tower band. */
export function towerTexture(text: string) {
  const { c, g } = canvas(1024, 128);
  g.fillStyle = '#e9eef2';
  g.fillRect(0, 0, 1024, 128);
  g.fillStyle = '#2f5d8c';
  g.font = '700 74px "Michroma", "Arial Black", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 66);
  g.fillText(text, 768, 66);
  return tex(c);
}

/** A framed certificate for the study wall. */
export function certificateTexture(title: string, line: string, year: string, accent: string, header = 'CERTIFICATE') {
  const { c, g } = canvas(512, 384);
  g.fillStyle = '#6b4a35';
  g.fillRect(0, 0, 512, 384);
  g.fillStyle = '#fbf6ec';
  g.fillRect(22, 22, 468, 340);
  g.strokeStyle = accent;
  g.lineWidth = 6;
  g.strokeRect(40, 40, 432, 304);
  g.textAlign = 'center';
  g.fillStyle = accent;
  g.font = '600 22px Georgia, serif';
  g.fillText(header, 256, 92);
  g.fillStyle = '#2d2620';
  g.font = '700 36px Georgia, serif';
  g.fillText(title, 256, 160);
  g.font = '400 24px Georgia, serif';
  g.fillStyle = '#5b5048';
  g.fillText(line, 256, 210);
  g.fillStyle = accent;
  g.beginPath();
  g.arc(256, 280, 34, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fff';
  g.font = '700 22px Georgia, serif';
  g.fillText(year, 256, 288);
  return tex(c);
}

/** Oncure poster: a nanobot approaching a tumour cell, with the title. */
export function oncurePosterTexture() {
  const { c, g } = canvas(512, 720);
  const bg = g.createLinearGradient(0, 0, 0, 720);
  bg.addColorStop(0, '#20203f');
  bg.addColorStop(1, '#3b2450');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 720);
  const healthy: [number, number, number][] = [[90, 470, 46], [400, 560, 40], [150, 610, 34], [430, 420, 30]];
  for (const [x, y, r] of healthy) {
    g.fillStyle = 'rgba(255,150,170,0.85)';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(200,70,100,0.9)';
    g.beginPath();
    g.arc(x + 6, y - 4, r * 0.3, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#8e4fc4';
  g.beginPath();
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 78 + (i % 2 ? 14 : -6);
    if (i) g.lineTo(300 + Math.cos(a) * r, 300 + Math.sin(a) * r);
    else g.moveTo(300 + Math.cos(a) * r, 300 + Math.sin(a) * r);
  }
  g.fill();
  g.fillStyle = '#5b2a8a';
  g.beginPath();
  g.arc(310, 296, 30, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(120,220,255,0.6)';
  g.lineWidth = 3;
  g.setLineDash([8, 8]);
  g.beginPath();
  g.moveTo(130, 230);
  g.lineTo(240, 290);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = '#ffd25e';
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.lineTo(115 + Math.cos(a) * 26, 220 + Math.sin(a) * 26);
  }
  g.fill();
  g.fillStyle = '#20203f';
  g.beginPath();
  g.arc(115, 220, 9, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.font = '700 70px "Michroma", sans-serif';
  g.fillText('ONCURE', 256, 110);
  g.font = '400 22px "Manrope", sans-serif';
  g.fillStyle = '#c9c4f0';
  g.fillText('AI-guided nanobot cancer therapy', 256, 150);
  g.font = '600 18px "Manrope", sans-serif';
  g.fillText('RESEARCH CONCEPT', 256, 690);
  return tex(c);
}

/** Laptop screen: the stock app in progress (illustrative chart, no real data). */
export function stockScreenTexture() {
  const { c, g } = canvas(512, 320);
  g.fillStyle = '#10131c';
  g.fillRect(0, 0, 512, 320);
  g.fillStyle = '#9fb3d9';
  g.font = '600 20px "Manrope", sans-serif';
  g.fillText('Stock trading app · in progress', 20, 34);
  g.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let y = 70; y < 300; y += 40) {
    g.beginPath();
    g.moveTo(20, y);
    g.lineTo(492, y);
    g.stroke();
  }
  g.strokeStyle = '#3ddc97';
  g.lineWidth = 4;
  g.beginPath();
  let y = 250;
  for (let x = 20; x <= 492; x += 16) {
    y += Math.sin(x * 0.05) * 14 - 5 + Math.cos(x * 0.13) * 8;
    y = Math.max(80, Math.min(280, y));
    if (x === 20) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  g.fillStyle = 'rgba(159,179,217,0.6)';
  g.font = '400 14px "Manrope", sans-serif';
  g.fillText('Illustration', 420, 306);
  return tex(c);
}

/** Cork pinboard: his school journey as pinned cards. */
export function pinboardTexture(steps: string[]) {
  const { c, g } = canvas(640, 400);
  g.fillStyle = '#c79a66';
  g.fillRect(0, 0, 640, 400);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(90,55,25,${((i * 37) % 18) / 100})`;
    g.fillRect((i * 71) % 640, (i * 113) % 400, 2, 2);
  }
  g.strokeStyle = '#6b4a35';
  g.lineWidth = 18;
  g.strokeRect(9, 9, 622, 382);
  g.fillStyle = '#3c2733';
  g.font = '700 26px "Manrope", sans-serif';
  g.textAlign = 'center';
  g.fillText('MY JOURNEY', 320, 54);
  const colors = ['#fff6a8', '#bfe6ff', '#ffd1dc'];
  steps.forEach((s, i) => {
    const x = 40 + i * 195;
    const yy = 110 + (i % 2) * 30;
    g.save();
    g.translate(x + 85, yy + 90);
    g.rotate((i - 1) * 0.05);
    g.fillStyle = colors[i % 3]!;
    g.fillRect(-85, -90, 170, 180);
    g.fillStyle = '#c44d3f';
    g.beginPath();
    g.arc(0, -78, 8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2d2620';
    g.font = '600 20px "Manrope", sans-serif';
    let line = '';
    let ly = -30;
    for (const w of s.split(' ')) {
      const test = line ? `${line} ${w}` : w;
      if (g.measureText(test).width > 150 && line) {
        g.fillText(line, 0, ly);
        line = w;
        ly += 26;
      } else line = test;
    }
    g.fillText(line, 0, ly);
    g.restore();
  });
  return tex(c);
}

/** Hand-lettered banner above the desk. */
export function bannerTexture(text: string) {
  const { c, g } = canvas(1024, 160);
  g.fillStyle = '#3c2733';
  g.font = '400 56px "Michroma", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 512, 84);
  return tex(c);
}
