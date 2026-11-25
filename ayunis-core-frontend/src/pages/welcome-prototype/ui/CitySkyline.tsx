import type { CSSProperties } from 'react';

const LINES = [
  'M20 200 H780',
  'M60 200 V150 L90 124 L120 150 V200',
  'M150 200 V186',
  'M190 200 V132 H250 V200',
  'M186 132 L220 36 L254 132',
  'M300 200 V120 H500 V200',
  'M290 120 L400 82 L510 120',
  'M374 98 V34 H426 V91',
  'M368 34 L400 10 L432 34',
  'M386 200 V170 A14 14 0 0 1 414 170 V200',
  'M540 200 V140 L575 110 L610 140 V200',
  'M620 200 V156 L650 130 L680 156 V200',
  'M720 200 V186',
];

const CIRCLES = [
  { cx: 150, cy: 170, r: 18 },
  { cx: 400, cy: 58, r: 11 },
  { cx: 220, cy: 104, r: 7 },
  { cx: 720, cy: 166, r: 22 },
];

const WINDOWS = [
  [78, 160],
  [96, 160],
  [324, 136],
  [352, 136],
  [440, 136],
  [468, 136],
  [324, 166],
  [352, 166],
  [440, 166],
  [468, 166],
  [558, 152],
  [584, 152],
  [636, 166],
  [656, 166],
];

const indexStyle = (index: number) => ({ '--i': index }) as CSSProperties;

export function CitySkyline() {
  return (
    <svg className="wp-city" viewBox="0 0 800 220" fill="none" aria-hidden>
      <ellipse className="wp-city__glow" cx="400" cy="200" rx="360" ry="120" />
      {LINES.map((d, index) => (
        <path
          key={d}
          d={d}
          pathLength={1}
          className="wp-city__line"
          style={indexStyle(index)}
        />
      ))}
      {CIRCLES.map((circle, index) => (
        <circle
          key={`${circle.cx}-${circle.cy}`}
          {...circle}
          pathLength={1}
          className="wp-city__line"
          style={indexStyle(LINES.length + index)}
        />
      ))}
      {WINDOWS.map(([x, y], index) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="12"
          height="14"
          rx="2"
          className="wp-city__window"
          style={indexStyle(index)}
        />
      ))}
    </svg>
  );
}
