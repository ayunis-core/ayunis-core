import type { CSSProperties } from 'react';

const STEP = 9;
const GROUND = 230;

const BUILDINGS = [
  { x: 40, w: 4, h: 9 },
  { x: 90, w: 5, h: 14 },
  { x: 150, w: 3, h: 7 },
  { x: 190, w: 4, h: 20 },
  { x: 240, w: 6, h: 11 },
  { x: 310, w: 5, h: 17 },
  { x: 365, w: 7, h: 23 },
  { x: 440, w: 5, h: 15 },
  { x: 495, w: 4, h: 21 },
  { x: 545, w: 6, h: 10 },
  { x: 610, w: 4, h: 16 },
  { x: 660, w: 5, h: 8 },
  { x: 710, w: 4, h: 13 },
];

const LINKS: ReadonlyArray<readonly [number, number]> = [
  [1, 3],
  [3, 6],
  [6, 8],
  [8, 10],
  [5, 7],
  [10, 12],
];

function top(index: number) {
  const building = BUILDINGS[index] ?? { x: 0, w: 1, h: 1 };
  return {
    x: building.x + ((building.w - 1) * STEP) / 2,
    y: GROUND - (building.h - 1) * STEP - 6,
  };
}

const style = (values: Record<string, number>) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [`--${key}`, value]),
  ) as CSSProperties;

export function CitySkyline() {
  return (
    <svg className="wp-city" viewBox="0 0 800 260" aria-hidden>
      <defs>
        <radialGradient id="wp-city-glow" cx="50%" cy="100%" r="70%">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect
        className="wp-city__glow"
        x="0"
        y="0"
        width="800"
        height="260"
        fill="url(#wp-city-glow)"
      />
      {BUILDINGS.map((building, b) =>
        Array.from({ length: building.h }, (_, row) =>
          Array.from({ length: building.w }, (_, col) => (
            <circle
              key={`${b}-${row}-${col}`}
              className={
                (b * 7 + row * 3 + col) % 11 === 0
                  ? 'wp-city__dot is-lit'
                  : 'wp-city__dot'
              }
              cx={building.x + col * STEP}
              cy={GROUND - row * STEP}
              r="1.9"
              style={style({ row, b })}
            />
          )),
        ),
      )}
      {LINKS.map(([from, to], index) => {
        const a = top(from);
        const z = top(to);
        const mid = (a.x + z.x) / 2;
        return (
          <path
            key={`${from}-${to}`}
            className="wp-city__link"
            d={`M${a.x} ${a.y} Q${mid} ${Math.min(a.y, z.y) - 45} ${z.x} ${z.y}`}
            pathLength={1}
            style={style({ i: index })}
          />
        );
      })}
    </svg>
  );
}
