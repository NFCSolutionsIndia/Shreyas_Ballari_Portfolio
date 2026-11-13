/**
 * Short animated films drawn on a canvas, shown on the roadside projector screens and in the
 * on-screen project sheets. They explain ideas visually; they are illustrations, not data:
 * Oncure is a concept (not a cure), the stock app shows typical features until Shreyas's own are
 * supplied, and tutoring shows the confirmed way he teaches (visual aids, step by step).
 */

export interface Film {
  id: string;
  title: string;
  accent: string;
  /** One caption per scene. */
  scenes: string[];
  dur: number;
  draw: (g: CanvasRenderingContext2D, scene: number, f: number, time: number, w: number, h: number) => void;
}

const TAU = Math.PI * 2;
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function healthyCell(g: CanvasRenderingContext2D, x: number, y: number, r: number, glow = 0) {
  if (glow > 0) {
    g.fillStyle = `rgba(61,220,151,${0.35 * glow})`;
    g.beginPath();
    g.arc(x, y, r * 1.35, 0, TAU);
    g.fill();
  }
  const grad = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  grad.addColorStop(0, '#ffd0da');
  grad.addColorStop(1, '#f28aa0');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
  g.fillStyle = '#c94c6a';
  g.beginPath();
  g.arc(x + r * 0.15, y - r * 0.1, r * 0.32, 0, TAU);
  g.fill();
}

function cancerCell(g: CanvasRenderingContext2D, x: number, y: number, r: number, time: number, broken = 0) {
  const pieces = 9;
  for (let i = 0; i < pieces; i++) {
    const a0 = (i / pieces) * TAU;
    const a1 = ((i + 1) / pieces) * TAU;
    const drift = broken * (14 + (i % 3) * 8);
    const am = (a0 + a1) / 2;
    const ox = Math.cos(am) * drift;
    const oy = Math.sin(am) * drift;
    g.globalAlpha = 1 - broken * 0.85;
    g.fillStyle = '#8f4fc9';
    g.beginPath();
    g.moveTo(x + ox, y + oy);
    for (let k = 0; k <= 4; k++) {
      const a = a0 + ((a1 - a0) * k) / 4;
      const rr = r * (1 + Math.sin(a * 5 + time * 2) * 0.12);
      g.lineTo(x + ox + Math.cos(a) * rr, y + oy + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
  }
  g.globalAlpha = 1 - broken;
  g.fillStyle = '#4e2380';
  g.beginPath();
  g.arc(x, y, r * 0.38, 0, TAU);
  g.fill();
  // Surface markers (what the bots recognise).
  g.fillStyle = '#ffb84a';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + time * 0.3;
    g.beginPath();
    g.arc(x + Math.cos(a) * r * 1.08, y + Math.sin(a) * r * 1.08, 3.2, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
}

function bot(g: CanvasRenderingContext2D, x: number, y: number, s: number, time: number, angle = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.fillStyle = '#ffd25e';
  g.strokeStyle = '#b8860b';
  g.lineWidth = 1.5;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    g.lineTo(Math.cos(a) * s, Math.sin(a) * s);
  }
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#2b1f35';
  g.beginPath();
  g.arc(0, 0, s * 0.38, 0, TAU);
  g.fill();
  // Little legs / flagella.
  g.strokeStyle = '#ffd25e';
  for (let i = 0; i < 3; i++) {
    const a = Math.PI + (i - 1) * 0.5;
    g.beginPath();
    g.moveTo(Math.cos(a) * s, Math.sin(a) * s);
    g.quadraticCurveTo(Math.cos(a) * s * 1.6, Math.sin(a) * s * 1.6 + Math.sin(time * 12 + i) * 3, Math.cos(a) * s * 2.1, Math.sin(a) * s * 2.1);
    g.stroke();
  }
  g.restore();
}

function redBloodCell(g: CanvasRenderingContext2D, x: number, y: number, r: number, tilt: number) {
  g.save();
  g.translate(x, y);
  g.rotate(tilt);
  g.fillStyle = '#d8434e';
  g.beginPath();
  g.ellipse(0, 0, r, r * 0.6, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#b8323d';
  g.beginPath();
  g.ellipse(0, 0, r * 0.45, r * 0.25, 0, 0, TAU);
  g.fill();
  g.restore();
}

function vessel(g: CanvasRenderingContext2D, w: number, y: number, hh: number) {
  const grad = g.createLinearGradient(0, y - hh, 0, y + hh);
  grad.addColorStop(0, '#5a1f2c');
  grad.addColorStop(0.15, '#f7c4c9');
  grad.addColorStop(0.85, '#f7c4c9');
  grad.addColorStop(1, '#5a1f2c');
  g.fillStyle = grad;
  g.fillRect(0, y - hh, w, hh * 2);
}

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, color = '#ffffff', size = 20) {
  g.font = `600 ${size}px "Manrope", sans-serif`;
  const m = g.measureText(text).width;
  g.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(g, x - m / 2 - 10, y - size, m + 20, size * 1.5, 8);
  g.fill();
  g.fillStyle = color;
  g.textAlign = 'center';
  g.fillText(text, x, y + 2);
}

// --- Oncure -------------------------------------------------------------------------------

export const ONCURE: Film = {
  id: 'oncure',
  title: 'Oncure · how the concept works',
  accent: '#ffd25e',
  dur: 4.2,
  scenes: [
    'Imaging finds where the tumour is',
    'Nanobots carrying the medicine are injected into the bloodstream',
    'They travel through the blood vessels',
    'AI guidance: sensors recognise markers on cancer cells',
    'The bots attach and release the anti-cancer drug',
    'Cancer cells break down; healthy cells are spared',
    'The bots are cleared from the body · a concept, not a cure',
  ],
  draw(g, k, f, time, w, h) {
    g.fillStyle = '#14132a';
    g.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h * 0.52;
    if (k === 0) {
      // Body silhouette and a scanner sweeping down.
      g.fillStyle = '#2b2f55';
      g.beginPath();
      g.arc(cx, cy - 150, 34, 0, TAU);
      g.fill();
      roundRect(g, cx - 70, cy - 108, 140, 210, 50);
      g.fill();
      roundRect(g, cx - 110, cy - 100, 30, 170, 15);
      g.fill();
      roundRect(g, cx + 80, cy - 100, 30, 170, 15);
      g.fill();
      const scanY = cy - 190 + ease(f) * 330;
      g.fillStyle = 'rgba(126,224,255,0.18)';
      g.fillRect(cx - 180, cy - 190, 360, scanY - (cy - 190));
      g.fillStyle = '#7ee0ff';
      g.fillRect(cx - 180, scanY - 2, 360, 4);
      if (scanY > cy - 30) {
        const pulse = 0.6 + 0.4 * Math.sin(time * 6);
        g.fillStyle = `rgba(255,80,110,${pulse})`;
        g.beginPath();
        g.arc(cx + 22, cy - 40, 14, 0, TAU);
        g.fill();
        g.strokeStyle = '#ff6b81';
        g.lineWidth = 2;
        g.strokeRect(cx + 2, cy - 60, 40, 40);
        label(g, 'Tumour located', cx + 120, cy - 60, '#ffb3c1');
      }
    } else if (k === 1) {
      // Arm with a vein; syringe injects the bots.
      g.fillStyle = '#f2d4c0';
      roundRect(g, 40, cy - 60, w - 80, 120, 60);
      g.fill();
      g.strokeStyle = '#6f86c9';
      g.lineWidth = 10;
      g.beginPath();
      g.moveTo(60, cy + 6);
      g.bezierCurveTo(w * 0.35, cy - 10, w * 0.65, cy + 20, w - 60, cy);
      g.stroke();
      const sx = w * 0.62 + (1 - ease(clamp(f * 2))) * 220;
      g.save();
      g.translate(sx, cy - 70);
      g.rotate(-0.5);
      g.fillStyle = 'rgba(220,235,255,0.9)';
      g.fillRect(0, -14, 150, 28);
      g.fillStyle = '#ffd25e';
      g.fillRect(10 + clamp(f * 2 - 0.5) * 100, -10, 120 - clamp(f * 2 - 0.5) * 100, 20);
      g.fillStyle = '#9aa3b5';
      g.fillRect(150, -6, 40, 12);
      g.fillRect(-60 + clamp(f * 2 - 0.5) * 100, -4, 60, 8);
      g.strokeStyle = '#cfd6e4';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(-50, 0);
      g.stroke();
      g.restore();
      const n = Math.floor(clamp(f * 2 - 0.6) * 10);
      for (let i = 0; i < n; i++) bot(g, w * 0.55 - i * 30 - (f * 120 % 30), cy + 4 + Math.sin(i + time * 4) * 3, 7, time);
    } else if (k === 2) {
      vessel(g, w, cy, 110);
      for (let i = 0; i < 14; i++) {
        const x = ((i * 97 + time * 120) % (w + 80)) - 40;
        redBloodCell(g, x, cy - 70 + ((i * 53) % 140), 18, i + time);
      }
      for (let i = 0; i < 5; i++) {
        const x = ((i * 150 + time * 160) % (w + 80)) - 40;
        bot(g, x, cy - 30 + i * 16 + Math.sin(time * 5 + i) * 6, 10, time);
      }
    } else if (k === 3) {
      vessel(g, w, cy, 140);
      const cells = [[w * 0.22, cy - 50, 'h'], [w * 0.4, cy + 50, 'c'], [w * 0.58, cy - 40, 'h'], [w * 0.76, cy + 40, 'c']] as const;
      cells.forEach(([x, y, kind], i) => {
        if (kind === 'h') healthyCell(g, x, y, 38);
        else cancerCell(g, x, y, 40, time);
        const checked = f > 0.15 + i * 0.18;
        if (checked) {
          g.strokeStyle = kind === 'h' ? '#3ddc97' : '#ff5a7a';
          g.lineWidth = 3;
          g.setLineDash([6, 5]);
          g.beginPath();
          g.arc(x, y, 54, 0, TAU);
          g.stroke();
          g.setLineDash([]);
          label(g, kind === 'h' ? 'Healthy · pass by' : 'Cancer marker found', x, y - 66, kind === 'h' ? '#b8f5d8' : '#ffb3c1', 16);
        }
        // A bot scanning each cell in turn with a beam.
        const bx = x - 70 + Math.sin(time * 3 + i) * 6;
        bot(g, bx, y + 60, 9, time);
        if (Math.abs(f * 5 - i - 0.6) < 0.6) {
          g.strokeStyle = 'rgba(126,224,255,0.8)';
          g.beginPath();
          g.moveTo(bx + 9, y + 55);
          g.lineTo(x, y);
          g.stroke();
        }
      });
      label(g, 'AI matches the markers', w / 2, 92, '#7ee0ff', 18);
    } else if (k === 4) {
      vessel(g, w, cy, 140);
      const x = w * 0.5;
      cancerCell(g, x, cy, 70, time);
      healthyCell(g, w * 0.18, cy - 40, 40);
      healthyCell(g, w * 0.84, cy + 40, 40);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const dock = ease(clamp(f * 1.6));
        const r = 170 - dock * 92;
        bot(g, x + Math.cos(a) * r, cy + Math.sin(a) * r, 11, time, a + Math.PI);
      }
      if (f > 0.55) {
        for (let i = 0; i < 40; i++) {
          const a = (i / 40) * TAU + time;
          const rr = 78 - ((f - 0.55) / 0.45) * 60 * ((i % 5) / 5 + 0.4);
          g.fillStyle = 'rgba(61,220,151,0.9)';
          g.beginPath();
          g.arc(x + Math.cos(a) * rr, cy + Math.sin(a) * rr, 4, 0, TAU);
          g.fill();
        }
        label(g, 'Anti-cancer drug released', x, cy - 110, '#b8f5d8', 18);
      }
    } else if (k === 5) {
      vessel(g, w, cy, 140);
      cancerCell(g, w * 0.5, cy, 70, time, ease(f));
      healthyCell(g, w * 0.2, cy - 40, 42, 0.5 + 0.5 * Math.sin(time * 3));
      healthyCell(g, w * 0.8, cy + 40, 42, 0.5 + 0.5 * Math.sin(time * 3 + 1));
      healthyCell(g, w * 0.33, cy + 70, 30, 0.5);
      if (f > 0.5) label(g, 'Healthy cells spared', w * 0.5, cy + 120, '#b8f5d8', 18);
    } else {
      // Bots fade out; title card.
      g.globalAlpha = 1 - clamp(f * 2);
      vessel(g, w, cy, 140);
      for (let i = 0; i < 6; i++) bot(g, w * 0.2 + i * 110, cy + Math.sin(time + i) * 20 - f * 60, 10, time);
      g.globalAlpha = clamp(f * 2 - 0.6);
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.font = '700 64px "Michroma", sans-serif';
      g.fillText('ONCURE', cx, cy - 20);
      g.font = '500 22px "Manrope", sans-serif';
      g.fillStyle = '#c9c4f0';
      g.fillText('AI-guided nanobot cancer therapy · a research concept by Shreyas Ballari', cx, cy + 26);
      g.fillText('Not a cure. Workflow and findings from the proposal: to be supplied.', cx, cy + 60);
      g.globalAlpha = 1;
    }
  },
};

// --- Stock trading app -------------------------------------------------------------------------

const TICKERS = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE'];

export const STOCKS: Film = {
  id: 'finance',
  title: 'AI stock trading app · in progress',
  accent: '#3ddc97',
  dur: 4,
  scenes: [
    'Top performers you may be interested in',
    'AI advice beside the chart: how much, when to buy, when to sell',
    'Buy and sell, with pending orders tracked',
    'Your dashboard: holdings and the stage each one is at',
    'Beginner friendly, welcoming to veterans · in progress',
  ],
  draw(g, k, f, time, w, h) {
    g.fillStyle = '#0e121b';
    g.fillRect(0, 0, w, h);
    // App frame
    g.fillStyle = '#161c29';
    roundRect(g, 40, 70, w - 80, h - 150, 18);
    g.fill();
    g.fillStyle = '#9fb3d9';
    g.textAlign = 'left';
    g.font = '600 16px "Manrope", sans-serif';
    g.fillText('Illustration · sample tickers', 64, 100);
    if (k === 0) {
      TICKERS.forEach((t, i) => {
        const y = 140 + i * 56;
        const ch = Math.sin(time * 0.8 + i * 1.7) * 2.4;
        const show = clamp(f * 6 - i * 0.6);
        g.globalAlpha = show;
        g.fillStyle = '#1f2738';
        roundRect(g, 64, y - 26, w - 128, 46, 10);
        g.fill();
        g.fillStyle = '#e6ecf8';
        g.font = '700 20px "Michroma", sans-serif';
        g.fillText(t, 84, y + 4);
        g.strokeStyle = ch >= 0 ? '#3ddc97' : '#ff6b81';
        g.lineWidth = 2;
        g.beginPath();
        for (let x = 0; x < 160; x += 8) {
          const yy = y - 4 + Math.sin((x + time * 40 + i * 30) * 0.06) * 8;
          if (x) g.lineTo(w * 0.42 + x, yy);
          else g.moveTo(w * 0.42 + x, yy);
        }
        g.stroke();
        g.fillStyle = ch >= 0 ? '#3ddc97' : '#ff6b81';
        g.textAlign = 'right';
        g.font = '600 18px "Manrope", sans-serif';
        g.fillText(`${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%`, w - 84, y + 4);
        g.textAlign = 'left';
        g.globalAlpha = 1;
      });
    } else if (k === 1) {
      const n = 30;
      const cw = (w - 160) / n;
      let price = 120;
      const pts: [number, number][] = [];
      const visible = Math.floor(clamp(f * 1.4) * n);
      for (let i = 0; i < n; i++) {
        const open = price;
        const close = price + Math.sin(i * 1.3) * 6 + Math.cos(i * 0.4) * 4 + 1.2;
        price = close;
        if (i > visible) continue;
        const x = 80 + i * cw;
        const y = (v: number) => h - 130 - (v - 90) * 3;
        g.fillStyle = close >= open ? '#3ddc97' : '#ff6b81';
        g.fillRect(x + 2, Math.min(y(open), y(close)), cw - 4, Math.max(2, Math.abs(y(open) - y(close))));
        g.fillRect(x + cw / 2 - 1, y(Math.max(open, close) + 3), 2, y(Math.min(open, close) - 3) - y(Math.max(open, close) + 3));
        pts.push([x + cw / 2, y((open + close) / 2)]);
      }
      g.strokeStyle = '#f2c14e';
      g.lineWidth = 2.5;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
      g.fillStyle = '#f2c14e';
      g.font = '600 16px "Manrope", sans-serif';
      g.fillText('— trend', w - 200, 100);
      // AI advice card next to the chart.
      if (f > 0.35) {
        g.globalAlpha = clamp((f - 0.35) * 4);
        g.fillStyle = 'rgba(61,220,151,0.14)';
        roundRect(g, w - 330, 120, 270, 170, 14);
        g.fill();
        g.fillStyle = '#3ddc97';
        g.font = '700 18px "Manrope", sans-serif';
        g.fillText('AI advice', w - 310, 152);
        g.fillStyle = '#e6ecf8';
        g.font = '500 16px "Manrope", sans-serif';
        g.fillText('Buy: 12 shares', w - 310, 186);
        g.fillText('When: this week', w - 310, 214);
        g.fillText('Est. sell: in 3 to 5 months', w - 310, 242);
        g.fillStyle = '#9fb3d9';
        g.font = '400 13px "Manrope", sans-serif';
        g.fillText('Sample figures · illustration', w - 310, 272);
        g.globalAlpha = 1;
      }
    } else if (k === 2) {
      g.fillStyle = '#1f2738';
      roundRect(g, w / 2 - 210, 120, 420, 300, 16);
      g.fill();
      g.fillStyle = '#e6ecf8';
      g.font = '700 24px "Michroma", sans-serif';
      g.textAlign = 'center';
      g.fillText('AAA', w / 2, 165);
      const buy = f < 0.5 || Math.floor(time * 2) % 2 === 0;
      ['BUY', 'SELL'].forEach((t, i) => {
        g.fillStyle = (i === 0) === buy ? (i === 0 ? '#3ddc97' : '#ff6b81') : '#2a3346';
        roundRect(g, w / 2 - 180 + i * 185, 190, 175, 46, 10);
        g.fill();
        g.fillStyle = '#0e121b';
        g.font = '700 18px "Manrope", sans-serif';
        g.fillText(t, w / 2 - 92 + i * 185, 220);
      });
      const qty = Math.min(10, Math.floor(f * 20));
      g.fillStyle = '#9fb3d9';
      g.font = '500 18px "Manrope", sans-serif';
      g.fillText(`Quantity: ${qty}`, w / 2, 280);
      const pressed = f > 0.7;
      g.fillStyle = pressed ? '#2f8f6a' : '#3ddc97';
      roundRect(g, w / 2 - 150, 310, 300, 52, 12);
      g.fill();
      g.fillStyle = '#0e121b';
      g.font = '700 18px "Manrope", sans-serif';
      g.fillText(pressed ? 'Added to pending orders ✓' : 'Place order', w / 2, 343);
      g.textAlign = 'left';
    } else if (k === 3) {
      const parts = [0.34, 0.22, 0.18, 0.14, 0.12];
      const cols = ['#3ddc97', '#7ee0ff', '#f2c14e', '#b48ead', '#ff6b81'];
      let a = -Math.PI / 2;
      const grow = ease(clamp(f * 1.5));
      parts.forEach((p, i) => {
        const a2 = a + p * TAU * grow;
        g.fillStyle = cols[i]!;
        g.beginPath();
        g.moveTo(w * 0.32, h * 0.5);
        g.arc(w * 0.32, h * 0.5, 130, a, a2);
        g.fill();
        a = a2;
      });
      g.fillStyle = '#161c29';
      g.beginPath();
      g.arc(w * 0.32, h * 0.5, 72, 0, TAU);
      g.fill();
      g.fillStyle = '#e6ecf8';
      g.font = '700 22px "Michroma", sans-serif';
      g.textAlign = 'center';
      g.fillText('Holdings', w * 0.32, h * 0.5 + 8);
      g.textAlign = 'left';
      TICKERS.forEach((t, i) => {
        g.fillStyle = cols[i]!;
        g.fillRect(w * 0.58, 160 + i * 44, 18, 18);
        g.fillStyle = '#e6ecf8';
        g.font = '600 18px "Manrope", sans-serif';
        g.fillText(`${t}  ${Math.round(parts[i]! * 100)}%  ·  ${['Holding', 'Buy stage', 'Sell soon', 'Holding', 'Pending'][i]}`, w * 0.58 + 30, 176 + i * 44);
      });
    } else {
      g.fillStyle = '#e6ecf8';
      g.textAlign = 'center';
      g.font = '700 40px "Michroma", sans-serif';
      g.fillText('AI STOCK TRADING APP', w / 2, h / 2 - 20);
      g.fillStyle = '#f2c14e';
      g.font = '600 22px "Manrope", sans-serif';
      g.fillText('Beginner friendly · welcoming to veterans · in progress', w / 2, h / 2 + 22);
      g.fillStyle = '#9fb3d9';
      g.font = '500 18px "Manrope", sans-serif';
      g.fillText('No candlesticks or equations needed: the AI explains when and how much.', w / 2, h / 2 + 60);
      g.textAlign = 'left';
    }
  },
};

// --- Peer tutoring -----------------------------------------------------------------------------

function person(g: CanvasRenderingContext2D, x: number, y: number, s: number, shirt: string, wave = 0) {
  g.fillStyle = shirt;
  roundRect(g, x - 22 * s, y - 10 * s, 44 * s, 60 * s, 18 * s);
  g.fill();
  g.fillStyle = '#f2d4c0';
  g.beginPath();
  g.arc(x, y - 28 * s, 18 * s, 0, TAU);
  g.fill();
  g.fillStyle = '#121010';
  g.beginPath();
  g.arc(x, y - 34 * s, 18 * s, Math.PI, TAU);
  g.fill();
  if (wave) {
    g.strokeStyle = shirt;
    g.lineWidth = 9 * s;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x + 18 * s, y);
    g.lineTo(x + 44 * s, y - 30 * s - Math.sin(wave) * 10 * s);
    g.stroke();
  }
}

export const TUTORING: Film = {
  id: 'tutoring',
  title: 'Peer tutoring',
  accent: '#7ee0ff',
  dur: 4,
  scenes: [
    'One to one: 7th and 8th graders, Math and Science',
    'Small groups: everyone learns from each other',
    'Visual aids: drawing the idea makes it click',
    'Step by step: each line follows from the last',
    'Peer tutor · Math and Science'
  ],
  draw(g, k, f, time, w, h) {
    g.fillStyle = '#1b2433';
    g.fillRect(0, 0, w, h);
    // Whiteboard
    g.fillStyle = '#f4f6f8';
    roundRect(g, w * 0.36, 90, w * 0.58, h * 0.56, 12);
    g.fill();
    g.strokeStyle = '#9aa3b5';
    g.lineWidth = 6;
    g.stroke();
    const bx = w * 0.36;
    const by = 90;
    const bw = w * 0.58;
    const bh = h * 0.56;
    g.fillStyle = '#8a6a50';
    g.fillRect(0, h * 0.78, w, h * 0.22);
    if (k === 0) {
      person(g, w * 0.13, h * 0.66, 1.1, '#2e4566', time * 4);
      person(g, w * 0.27, h * 0.68, 1, '#c44d3f');
      g.fillStyle = '#ffffff';
      roundRect(g, w * 0.17, h * 0.3, 90, 46, 12);
      g.fill();
      g.fillStyle = '#1b2433';
      g.font = '700 26px "Manrope", sans-serif';
      g.textAlign = 'center';
      g.fillText('Why?', w * 0.17 + 45, h * 0.3 + 32);
      g.fillStyle = '#2e4566';
      g.font = '600 30px "Manrope", sans-serif';
      g.fillText('What do we know?', bx + bw / 2, by + 80);
      g.fillText('What do we need?', bx + bw / 2, by + 140);
      g.textAlign = 'left';
    } else if (k === 1) {
      person(g, w * 0.1, h * 0.62, 1.15, '#2e4566', time * 4);
      [0.2, 0.27, 0.34].forEach((x, i) => person(g, w * x, h * 0.72, 0.85, ['#c44d3f', '#3f7d6a', '#c9a24a'][i]!));
      g.fillStyle = '#2e4566';
      g.font = '600 28px "Manrope", sans-serif';
      g.textAlign = 'center';
      g.fillText('Group problem', bx + bw / 2, by + 70);
      for (let i = 0; i < 3; i++) {
        g.globalAlpha = clamp(f * 4 - i);
        g.fillText(['Idea 1 ✓', 'Idea 2 ✓', 'Together ✓'][i]!, bx + bw / 2, by + 130 + i * 50);
      }
      g.globalAlpha = 1;
      g.textAlign = 'left';
    } else if (k === 2) {
      person(g, w * 0.14, h * 0.64, 1.15, '#2e4566', time * 4);
      // Fraction pie drawn progressively: 3/4.
      const cxp = bx + bw * 0.3;
      const cyp = by + bh * 0.5;
      const grow = ease(clamp(f * 1.5));
      g.fillStyle = '#7ee0ff';
      g.beginPath();
      g.moveTo(cxp, cyp);
      g.arc(cxp, cyp, 90, -Math.PI / 2, -Math.PI / 2 + TAU * 0.75 * grow);
      g.fill();
      g.strokeStyle = '#2e4566';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(cxp, cyp, 90, 0, TAU);
      g.stroke();
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (i / 4) * TAU;
        g.beginPath();
        g.moveTo(cxp, cyp);
        g.lineTo(cxp + Math.cos(a) * 90, cyp + Math.sin(a) * 90);
        g.stroke();
      }
      g.fillStyle = '#2e4566';
      g.font = '700 64px "Manrope", sans-serif';
      g.textAlign = 'center';
      g.globalAlpha = clamp(f * 2 - 0.8);
      g.fillText('= 3/4', bx + bw * 0.72, cyp + 20);
      g.globalAlpha = 1;
      g.textAlign = 'left';
    } else if (k === 3) {
      person(g, w * 0.14, h * 0.64, 1.15, '#2e4566', time * 4);
      const lines = ['2x + 3 = 11', '2x = 11 − 3', '2x = 8', 'x = 4 ✓'];
      g.fillStyle = '#2e4566';
      g.font = '600 38px "Manrope", sans-serif';
      lines.forEach((l, i) => {
        g.globalAlpha = clamp(f * 5 - i);
        g.fillStyle = i === 3 ? '#2f8f6a' : '#2e4566';
        g.fillText(l, bx + 40, by + 70 + i * 62);
      });
      g.globalAlpha = 1;
    } else {
      g.fillStyle = '#2e4566';
      g.textAlign = 'center';
      g.font = '700 40px "Michroma", sans-serif';
      g.fillText('PEER TUTORING', bx + bw / 2, by + bh / 2 - 20);
      g.font = '500 22px "Manrope", sans-serif';
      g.fillText('One to one and small groups', bx + bw / 2, by + bh / 2 + 20);
      g.fillText('Visual aids · step-by-step explanations', bx + bw / 2, by + bh / 2 + 54);
      g.textAlign = 'left';
      person(g, w * 0.16, h * 0.64, 1.15, '#2e4566', time * 4);
    }
  },
};

export const FILMS = { oncure: ONCURE, finance: STOCKS, tutoring: TUTORING } as const;

/** Draw a film frame: header, scene, caption. `forced` picks a scene (for the on-screen player). */
export function drawFilm(film: Film, g: CanvasRenderingContext2D, time: number, w: number, h: number, forced?: { scene: number; start: number }) {
  let k: number;
  let f: number;
  if (forced) {
    const local = time - forced.start;
    k = (forced.scene + Math.floor(local / film.dur)) % film.scenes.length;
    f = (local % film.dur) / film.dur;
  } else {
    k = Math.floor(time / film.dur) % film.scenes.length;
    f = (time % film.dur) / film.dur;
  }
  g.save();
  film.draw(g, k, f, time, w, h);
  g.restore();
  // Header
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(0, 0, w, 56);
  g.fillStyle = film.accent;
  g.textAlign = 'left';
  g.font = '700 22px "Michroma", sans-serif';
  g.fillText(film.title.toUpperCase(), 24, 37);
  film.scenes.forEach((_, i) => {
    g.fillStyle = i === k ? film.accent : 'rgba(255,255,255,0.25)';
    g.beginPath();
    g.arc(w - 30 - (film.scenes.length - 1 - i) * 20, 28, 6, 0, TAU);
    g.fill();
  });
  // Caption
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(0, h - 62, w, 62);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.font = '600 24px "Manrope", sans-serif';
  g.globalAlpha = clamp(f * 6);
  g.fillText(`${k + 1}. ${film.scenes[k]}`, w / 2, h - 22);
  g.globalAlpha = 1;
  g.textAlign = 'left';
  return k;
}
