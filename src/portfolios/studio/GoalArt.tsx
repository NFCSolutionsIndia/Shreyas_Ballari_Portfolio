import { useId } from 'react';
import './goals.css';

/**
 * Small animated scenes for the Studio's Goals cards, so each goal reads at a glance:
 * - university: his path through high school (9th to 12th, he is a junior) toward a university,
 * - ai: a neural network with signals flowing through it,
 * - lab: a microscope view where cancer cells are scanned, spotted and targeted,
 * - trading: a price chart drawing itself, with AI "buy" and "sell" signals.
 * Pure SVG + CSS (no images), so it stays sharp and light. Motion stops for reduced-motion users.
 */
export type GoalKind = 'university' | 'ai' | 'lab' | 'trading';

export function GoalArt({ kind }: { kind: GoalKind }) {
  return (
    <div className={`ga ga-${kind}`} aria-hidden="true">
      {kind === 'university' && <University />}
      {kind === 'ai' && <Network />}
      {kind === 'lab' && <Lab />}
      {kind === 'trading' && <Trading />}
    </div>
  );
}

const STARS = [
  [18, 22],
  [52, 14],
  [96, 30],
  [134, 12],
  [168, 26],
  [300, 16],
  [312, 44],
  [74, 52],
  [150, 50],
];

function University() {
  const steps = [
    { x: 34, y: 138, t: '9th', s: 'done' },
    { x: 78, y: 135, t: '10th', s: 'done' },
    { x: 122, y: 130, t: '11th', s: 'now' },
    { x: 166, y: 124, t: '12th', s: 'next' },
  ];
  return (
    <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice">
      {STARS.map(([x, y], i) => (
        <circle
          key={i}
          className="ga-star"
          cx={x}
          cy={y}
          r={1.2}
          style={{ animationDelay: `${i * 0.37}s` }}
        />
      ))}
      {/* the road from school to university */}
      <path className="ga-road" d="M14 141 C 70 139, 130 131, 196 122" />
      <path className="ga-road-flow" d="M14 141 C 70 139, 130 131, 196 122" />
      {steps.map((p) => (
        <g key={p.t} className={`ga-step is-${p.s}`}>
          {p.s === 'now' && <circle className="ga-ring" cx={p.x} cy={p.y} r={9} />}
          <circle cx={p.x} cy={p.y} r={5} />
          <text x={p.x} y={p.y - 11} textAnchor="middle">
            {p.t}
          </text>
        </g>
      ))}
      <text className="ga-here" x={122} y={156} textAnchor="middle">
        he is here
      </text>
      {/* the university */}
      <g className="ga-uni">
        <polygon points="200,64 252,38 304,64" />
        <rect x={202} y={64} width={100} height={7} />
        {[210, 228, 246, 264, 282].map((x) => (
          <rect key={x} x={x} y={74} width={9} height={42} rx={1.5} />
        ))}
        <rect x={198} y={116} width={108} height={6} />
        <rect x={192} y={122} width={120} height={6} />
      </g>
      {/* the graduation cap, tossed in the air */}
      <g className="ga-cap">
        <polygon points="230,22 252,12 274,22 252,32" />
        <path d="M240 26 v8 c 0 4, 24 4, 24 0 v-8" />
        <path className="ga-tassel" d="M252 22 L270 24 L270 34" />
      </g>
      <text className="ga-label" x={252} y={146} textAnchor="middle">
        Bachelor’s degree
      </text>
    </svg>
  );
}

function Network() {
  const layers = [[40, 80, 120], [28, 64, 96, 132], [28, 64, 96, 132], [80]];
  const xs = [40, 120, 200, 282];
  const edges: { x1: number; y1: number; x2: number; y2: number; k: number }[] = [];
  layers.forEach((col, li) => {
    const next = layers[li + 1];
    if (!next) return;
    col.forEach((y1) =>
      next.forEach((y2) => edges.push({ x1: xs[li]!, y1, x2: xs[li + 1]!, y2, k: edges.length })),
    );
  });
  return (
    <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice">
      {edges.map((e) => (
        <line key={e.k} className="ga-edge" x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
      ))}
      {edges
        .filter((e) => e.k % 3 === 0)
        .map((e) => (
          <line
            key={`p${e.k}`}
            className="ga-pulse"
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            pathLength={100}
            style={{ animationDelay: `${(e.x1 / 280) * 1.2 + (e.k % 4) * 0.15}s` }}
          />
        ))}
      {layers.map((col, li) =>
        col.map((y) =>
          li === 3 ? null : (
            <circle
              key={`${li}-${y}`}
              className="ga-node"
              cx={xs[li]}
              cy={y}
              r={7}
              style={{ animationDelay: `${li * 0.4}s` }}
            />
          ),
        ),
      )}
      <g className="ga-out">
        <circle cx={282} cy={80} r={20} />
        <text x={282} y={85} textAnchor="middle">
          AI
        </text>
      </g>
      <text className="ga-label" x={40} y={152} textAnchor="middle">
        data
      </text>
      <text className="ga-label" x={160} y={152} textAnchor="middle">
        learning
      </text>
      <text className="ga-label" x={282} y={122} textAnchor="middle">
        answers
      </text>
    </svg>
  );
}

function Lab() {
  const id = useId().replace(/:/g, '');
  const cells = [
    [118, 52, 9],
    [146, 96, 8],
    [196, 60, 10],
    [170, 120, 7],
    [128, 118, 8],
    [210, 104, 8],
    [160, 34, 7],
  ];
  return (
    <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice">
      <defs>
        <clipPath id={`lens${id}`}>
          <circle cx={164} cy={80} r={66} />
        </clipPath>
      </defs>
      <circle className="ga-lens" cx={164} cy={80} r={66} />
      <g clipPath={`url(#lens${id})`}>
        <g className="ga-drift">
          {cells.map(([x, y, r], i) => (
            <g key={i} className="ga-cell">
              <circle cx={x} cy={y} r={r} />
              <circle className="ga-nuc" cx={x! + 1.5} cy={y! - 1} r={r! * 0.35} />
            </g>
          ))}
          {/* cancer cells: larger and irregular */}
          <path
            className="ga-bad"
            d="M178 78 q 8 -10 16 -2 q 9 4 3 13 q -2 10 -12 7 q -11 2 -10 -8 q -5 -6 3 -10z"
          />
          <path
            className="ga-bad is-2"
            d="M128 78 q 7 -8 14 -2 q 7 5 2 11 q -3 8 -11 5 q -9 0 -8 -7 q -3 -5 3 -7z"
          />
        </g>
        <path className="ga-sweep" d="M164 80 L230 80 A66 66 0 0 0 211 33 Z" />
        {/* nanobots heading to the cancer cells */}
        <circle className="ga-bot" cx={90} cy={40} r={2.6} />
        <circle className="ga-bot is-2" cx={240} cy={130} r={2.6} />
        <circle className="ga-bot is-3" cx={100} cy={136} r={2.6} />
      </g>
      <g className="ga-target">
        <circle cx={188} cy={86} r={15} />
        <path d="M188 66 v7 M188 99 v7 M168 86 h7 M201 86 h7" />
      </g>
      <g className="ga-target is-2">
        <circle cx={135} cy={83} r={13} />
        <path d="M135 65 v6 M135 95 v6 M117 83 h6 M147 83 h6" />
      </g>
      <circle className="ga-rim" cx={164} cy={80} r={66} />
      {['Scan', 'Detect', 'Target'].map((t, i) => (
        <g
          key={t}
          className="ga-chip"
          style={{ animationDelay: `${i * 1.4}s` }}
          transform={`translate(${i === 2 ? 252 : 14}, ${i === 2 ? 70 : 46 + i * 32})`}
        >
          <rect width={54} height={20} rx={10} />
          <text x={27} y={14} textAnchor="middle">
            {t}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Trading() {
  // Hypothetical prices: a dip, then a climb. Not real data.
  const c = [
    [70, 82],
    [82, 92],
    [92, 104],
    [104, 98],
    [98, 86],
    [86, 72],
    [72, 62],
    [62, 48],
    [48, 56],
    [56, 38],
    [38, 30],
  ];
  const x = (i: number) => 26 + i * 25;
  const line = c.map(([, close], i) => `${i ? 'L' : 'M'}${x(i)} ${close}`).join(' ');
  return (
    <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice">
      {[40, 70, 100, 130].map((y) => (
        <line key={y} className="ga-grid" x1={12} y1={y} x2={308} y2={y} />
      ))}
      {c.map(([open, close], i) => {
        const up = close! < open!;
        const top = Math.min(open!, close!);
        const h = Math.max(4, Math.abs(open! - close!));
        return (
          <g
            key={i}
            className={`ga-candle ${up ? 'is-up' : 'is-down'}`}
            style={{ animationDelay: `${i * 0.18}s` }}
          >
            <line x1={x(i)} y1={top - 6} x2={x(i)} y2={top + h + 6} />
            <rect x={x(i) - 6} y={top} width={12} height={h} rx={2} />
          </g>
        );
      })}
      <path className="ga-trend" d={line} pathLength={100} />
      <g transform={`translate(${x(3) - 22}, 116)`}>
        <g className="ga-signal is-buy">
          <rect width={44} height={20} rx={10} />
          <text x={22} y={14} textAnchor="middle">
            BUY
          </text>
        </g>
      </g>
      <g transform={`translate(${x(9) - 38}, 2)`}>
        <g className="ga-signal is-sell">
          <rect width={44} height={20} rx={10} />
          <text x={22} y={14} textAnchor="middle">
            SELL
          </text>
        </g>
      </g>
      <g className="ga-ai" transform="translate(12, 8)">
        <rect width={74} height={20} rx={10} />
        <text x={37} y={14} textAnchor="middle">
          AI signal
        </text>
      </g>
    </svg>
  );
}
