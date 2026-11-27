const BULB_COUNT = 16;
const SWAG_COUNT = 4;
const SAG_PX = 14;
const HEIGHT_PX = 30;

// Each swag of the wire is a parabola between two hooks; the bulbs hang on it.
const BULBS = Array.from({ length: BULB_COUNT }, (_, index) => {
  const x = (index + 0.5) / BULB_COUNT;
  const along = (x * SWAG_COUNT) % 1;
  return { x: x * 100, y: 4 * along * (1 - along) * SAG_PX };
});

const WIRE_PATH = Array.from({ length: SWAG_COUNT }, (_, swag) => {
  const from = (swag / SWAG_COUNT) * 100;
  const to = ((swag + 1) / SWAG_COUNT) * 100;
  return `M ${from} 0 Q ${(from + to) / 2} ${2 * SAG_PX} ${to} 0`;
}).join(' ');

export function AdventLights() {
  return (
    <div
      aria-hidden
      className="advent-calendar-lights pointer-events-none absolute inset-x-0 top-0"
      style={{ height: HEIGHT_PX }}
      data-testid="advent-calendar-lights"
    >
      <svg
        viewBox={`0 0 100 ${HEIGHT_PX}`}
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
      >
        <path
          d={WIRE_PATH}
          className="fill-none stroke-muted-foreground/60"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {BULBS.map(({ x, y }, index) => (
        <span
          key={x}
          className="advent-calendar-bulb"
          style={{
            left: `${x}%`,
            top: y,
            animationDelay: `${-((index * 7) % 11) * 0.3}s`,
            animationDuration: `${1.8 + ((index * 5) % 7) * 0.25}s`,
          }}
        />
      ))}
    </div>
  );
}
