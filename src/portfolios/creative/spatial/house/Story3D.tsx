import { useMemo } from 'react';
import { goals } from '@/content/portfolio';
import { B, canvasTexture, useMats } from './kit';
import { Framed } from './props';

/**
 * Canvas pictures of his story: the concept screens of his AI trading app (shown in the Finance
 * app) and the sign with his goals in the garden, seen through the living room's glass wall.
 * Every fact comes from content/portfolio.ts; the app screens are a concept design with sample
 * data.
 */

type G = CanvasRenderingContext2D;
const FONT = 'Manrope, "Segoe UI", Helvetica, Arial, sans-serif';

function round(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Writes text wrapped to a width; returns the y after the last line. */
function wrap(g: G, text: string, x: number, y: number, w: number, lh: number, max = 99) {
  const words = text.split(' ');
  let line = '';
  let n = 0;
  for (const word of words) {
    const t = line ? `${line} ${word}` : word;
    if (g.measureText(t).width > w && line) {
      g.fillText(line, x, y);
      y += lh;
      line = word;
      if (++n >= max - 1) break;
    } else line = t;
  }
  if (line) g.fillText(line, x, y);
  return y + lh;
}

const font = (g: G, size: number, weight = 600) => (g.font = `${weight} ${size}px ${FONT}`);

// --- Textures ---------------------------------------------------------------------------------

const SAMPLE = [
  { t: 'NOVA', n: 'Nova Labs (sample)', v: '+4.2%', up: true, stage: 'Holding' },
  { t: 'ORBT', n: 'Orbit Foods (sample)', v: '+1.8%', up: true, stage: 'Buying · 2 of 3' },
  { t: 'LUMA', n: 'Luma Energy (sample)', v: '−0.9%', up: false, stage: 'Sell window soon' },
];

function appChrome(g: G, w: number, h: number, active: string) {
  g.fillStyle = '#0d1117';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#131a24';
  g.fillRect(0, 0, 200, h);
  g.fillStyle = '#2fd18b';
  font(g, 26, 800);
  g.fillText('◆ TradeMind', 24, 52);
  ['Dashboard', 'Stocks', 'Holdings', 'Pending', 'Top picks', 'Calculator'].forEach((t, i) => {
    const on = t === active;
    if (on) {
      g.fillStyle = 'rgba(47,209,139,0.16)';
      round(g, 12, 90 + i * 56, 176, 44, 12);
      g.fill();
    }
    g.fillStyle = on ? '#2fd18b' : 'rgba(255,255,255,0.65)';
    font(g, 20, on ? 800 : 600);
    g.fillText(t, 30, 119 + i * 56);
  });
  g.fillStyle = 'rgba(255,255,255,0.35)';
  font(g, 15, 600);
  g.fillText('Concept design · sample data', 24, h - 20);
}

function spark(g: G, x: number, y: number, w: number, h: number, up: boolean, seed: number) {
  g.strokeStyle = up ? '#2fd18b' : '#ff5a6e';
  g.lineWidth = 4;
  g.beginPath();
  for (let i = 0; i <= 24; i++) {
    const v = Math.sin(i * 0.7 + seed) * 0.25 + (up ? i / 24 : 1 - i / 24) * 0.6 + 0.1;
    const px = x + (i / 24) * w;
    const py = y + h - v * h;
    if (i) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.stroke();
}

/** App screen 1: the dashboard (holdings with their buy/sell stage, pending orders, top picks). */
export function appDashboardTexture() {
  return canvasTexture(1280, 740, (g) => {
    appChrome(g, 1280, 740, 'Dashboard');
    g.fillStyle = '#fff';
    font(g, 34, 800);
    g.fillText('Your dashboard', 230, 62);
    // Holdings
    g.fillStyle = '#151d29';
    round(g, 230, 90, 640, 400, 22);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    font(g, 20, 700);
    g.fillText('HOLDINGS · BUY / SELL STAGE', 256, 128);
    SAMPLE.forEach((s, i) => {
      const y = 160 + i * 106;
      g.fillStyle = 'rgba(255,255,255,0.05)';
      round(g, 250, y, 600, 90, 16);
      g.fill();
      g.fillStyle = '#fff';
      font(g, 26, 800);
      g.fillText(s.t, 272, y + 40);
      g.fillStyle = 'rgba(255,255,255,0.6)';
      font(g, 17, 500);
      g.fillText(s.n, 272, y + 68);
      spark(g, 470, y + 18, 150, 54, s.up, i * 2);
      g.fillStyle = s.up ? '#2fd18b' : '#ff5a6e';
      font(g, 22, 800);
      g.fillText(s.v, 640, y + 52);
      g.fillStyle = 'rgba(47,209,139,0.16)';
      round(g, 720, y + 28, 118, 34, 17);
      g.fill();
      g.fillStyle = '#9ff0cb';
      font(g, 14, 700);
      g.fillText(s.stage, 732, y + 50);
    });
    // Pending
    g.fillStyle = '#151d29';
    round(g, 890, 90, 360, 190, 22);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    font(g, 20, 700);
    g.fillText('PENDING ORDERS', 914, 128);
    [['Buy ORBT', '3 shares · waiting'], ['Sell LUMA', 'in sell window']].forEach(([a, b], i) => {
      g.fillStyle = '#fff';
      font(g, 22, 700);
      g.fillText(a!, 914, 172 + i * 54);
      g.fillStyle = 'rgba(255,255,255,0.55)';
      font(g, 16, 500);
      g.fillText(b!, 914, 194 + i * 54);
    });
    // Top performers
    g.fillStyle = '#151d29';
    round(g, 890, 300, 360, 190, 22);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    font(g, 20, 700);
    g.fillText('TOP PERFORMERS FOR YOU', 914, 338);
    ['NOVA  ▲', 'KITE  ▲', 'ORBT  ▲'].forEach((t, i) => {
      g.fillStyle = '#2fd18b';
      font(g, 22, 800);
      g.fillText(t, 914, 380 + i * 36);
    });
    // AI tip
    const grad = g.createLinearGradient(230, 0, 1250, 0);
    grad.addColorStop(0, 'rgba(155,107,255,0.35)');
    grad.addColorStop(1, 'rgba(47,209,139,0.25)');
    g.fillStyle = grad;
    round(g, 230, 515, 1020, 170, 22);
    g.fill();
    g.fillStyle = '#fff';
    font(g, 22, 800);
    g.fillText('✦ AI ADVISOR', 256, 556);
    font(g, 30, 700);
    g.fillText('ORBT looks steady: finish your buy within 3–5 days.', 256, 604);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    font(g, 18, 500);
    g.fillText('Based on real-world data and algorithms · hypothetical, not financial advice', 256, 646);
  });
}

/** App screen 2: a stock with the AI's advice beside the graph. */
export function appStockTexture() {
  return canvasTexture(1280, 740, (g) => {
    appChrome(g, 1280, 740, 'Stocks');
    g.fillStyle = '#fff';
    font(g, 34, 800);
    g.fillText('NOVA · Nova Labs (sample)', 230, 62);
    g.fillStyle = '#151d29';
    round(g, 230, 90, 680, 600, 22);
    g.fill();
    // Area chart (no candlesticks: the AI does the reading)
    g.beginPath();
    const pts: [number, number][] = [];
    for (let i = 0; i <= 40; i++) {
      const v = Math.sin(i * 0.45) * 40 + Math.sin(i * 0.17) * 30 + i * 6;
      pts.push([260 + (i / 40) * 620, 560 - v]);
    }
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.strokeStyle = '#2fd18b';
    g.lineWidth = 5;
    g.stroke();
    g.lineTo(880, 650);
    g.lineTo(260, 650);
    g.closePath();
    const area = g.createLinearGradient(0, 300, 0, 650);
    area.addColorStop(0, 'rgba(47,209,139,0.35)');
    area.addColorStop(1, 'rgba(47,209,139,0)');
    g.fillStyle = area;
    g.fill();
    // Buy / sell markers
    const mark = (i: number, label: string, c: string) => {
      const [x, y] = pts[i]!;
      g.fillStyle = c;
      g.beginPath();
      g.arc(x, y, 12, 0, Math.PI * 2);
      g.fill();
      round(g, x - 50, y - 62, 100, 36, 18);
      g.fill();
      g.fillStyle = '#0d1117';
      font(g, 18, 800);
      g.textAlign = 'center';
      g.fillText(label, x, y - 38);
      g.textAlign = 'left';
    };
    mark(12, 'BUY', '#2fd18b');
    mark(34, 'SELL', '#ffd166');
    g.fillStyle = 'rgba(255,255,255,0.6)';
    font(g, 18, 600);
    g.fillText('Progress graph · last 6 months (sample)', 256, 128);
    // AI panel
    const grad = g.createLinearGradient(930, 90, 1250, 690);
    grad.addColorStop(0, '#2a1f55');
    grad.addColorStop(1, '#10283a');
    g.fillStyle = grad;
    round(g, 930, 90, 320, 600, 22);
    g.fill();
    g.fillStyle = '#c9b8ff';
    font(g, 20, 800);
    g.fillText('✦ AI ADVICE', 956, 132);
    const rows: [string, string][] = [
      ['How much', '12 shares'],
      ['When to buy', 'Next 3–5 days'],
      ['Estimated sell', 'In about 6 weeks'],
      ['Based on', 'Real-world data'],
    ];
    rows.forEach(([k, v], i) => {
      const y = 180 + i * 110;
      g.fillStyle = 'rgba(255,255,255,0.08)';
      round(g, 950, y, 280, 92, 16);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)';
      font(g, 17, 600);
      g.fillText(k, 970, y + 34);
      g.fillStyle = '#fff';
      font(g, 28, 800);
      g.fillText(v, 970, y + 72);
    });
    g.fillStyle = 'rgba(255,255,255,0.55)';
    font(g, 15, 500);
    g.fillText('Hypothetical · not financial advice', 956, 670);
  });
}

/** App screen 3: the AI calculator. */
export function appCalcTexture() {
  return canvasTexture(1280, 740, (g) => {
    appChrome(g, 1280, 740, 'Calculator');
    g.fillStyle = '#fff';
    font(g, 34, 800);
    g.fillText('AI amount and timing calculator', 230, 62);
    const field = (x: number, y: number, k: string, v: string) => {
      g.fillStyle = 'rgba(255,255,255,0.6)';
      font(g, 18, 600);
      g.fillText(k, x, y);
      g.fillStyle = '#151d29';
      round(g, x, y + 14, 460, 70, 16);
      g.fill();
      g.fillStyle = '#fff';
      font(g, 30, 700);
      g.fillText(v, x + 22, y + 60);
    };
    field(230, 130, 'Stock', 'NOVA (sample)');
    field(230, 250, 'Budget', '$500');
    field(230, 370, 'Goal', 'Steady growth');
    g.fillStyle = '#2fd18b';
    round(g, 230, 500, 460, 80, 40);
    g.fill();
    g.fillStyle = '#05261a';
    font(g, 30, 800);
    g.fillText('Calculate with AI', 330, 552);
    const grad = g.createLinearGradient(740, 120, 1250, 690);
    grad.addColorStop(0, '#2a1f55');
    grad.addColorStop(1, '#0f2b22');
    g.fillStyle = grad;
    round(g, 740, 110, 510, 580, 26);
    g.fill();
    g.fillStyle = '#c9b8ff';
    font(g, 20, 800);
    g.fillText('✦ SUGGESTION', 770, 160);
    g.fillStyle = '#fff';
    font(g, 72, 800);
    g.fillText('8 shares', 770, 260);
    font(g, 26, 600);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    wrap(g, 'Buy over the next week, and review a possible sell in about two months.', 770, 320, 450, 36, 3);
    g.fillStyle = 'rgba(255,255,255,0.1)';
    round(g, 770, 450, 450, 150, 18);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    font(g, 18, 600);
    wrap(g, 'Worked out by the AI model from real-world data and algorithms, instead of reading candlesticks and equations yourself.', 790, 490, 410, 28, 4);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    font(g, 15, 500);
    g.fillText('Hypothetical · not financial advice', 770, 660);
  });
}

/** The garden sign: his goals. */
export function goalsTexture() {
  return canvasTexture(1400, 860, (g) => {
    const grad = g.createLinearGradient(0, 0, 1400, 860);
    grad.addColorStop(0, '#1b2a4a');
    grad.addColorStop(1, '#3a1c3d');
    g.fillStyle = grad;
    g.fillRect(0, 0, 1400, 860);
    g.fillStyle = '#ffd166';
    font(g, 28, 800);
    g.fillText('LOOKING AHEAD', 70, 90);
    g.fillStyle = '#fff';
    font(g, 66, 800);
    g.fillText('His goals', 70, 165);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    font(g, 34, 600);
    wrap(g, `🎓  ${goals.education}`, 70, 260, 1260, 46, 2);
    goals.career.forEach((c, i) => {
      const y = 400 + i * 135;
      g.fillStyle = 'rgba(255,255,255,0.1)';
      round(g, 70, y, 1260, 110, 26);
      g.fill();
      g.fillStyle = '#fff';
      font(g, 36, 700);
      g.fillText(`${['🧠', '🔬', '📈'][i]}  ${c}`, 100, y + 68);
    });
  });
}

/** A simple gallery-style figure (no face), standing or seated. */

/** Garden: a sign with his goals. */
export function GoalsSign() {
  const tex = useMemo(goalsTexture, []);
  const m = useMats();
  return (
    <group position={[6.7, 0, -5.4]} rotation={[0, 1.15, 0]}>
      <B p={[-0.85, 0.75, -0.03]} s={[0.07, 1.5, 0.07]} m={m.walnut} />
      <B p={[0.85, 0.75, -0.03]} s={[0.07, 1.5, 0.07]} m={m.walnut} />
      <Framed position={[0, 1.45, 0]} w={1.8} h={1.1} tex={tex} frame="#2a1f17" mat={0.02} glow={0.4} />
    </group>
  );
}
