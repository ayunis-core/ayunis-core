const FLAKE_COUNT = 36;

// Spread over the width and staggered in time; the negative delays make it
// already snow when the page opens.
const FLAKES = Array.from({ length: FLAKE_COUNT }, (_, index) => ({
  left: ((index * 37) % 100) + ((index * 13) % 7) / 7,
  size: 3 + ((index * 7) % 4),
  fall: 9 + ((index * 11) % 8),
  delay: -((index * 17) % 16),
  sway: 2.5 + ((index * 3) % 5) * 0.5,
  opacity: 0.55 + ((index * 5) % 4) * 0.12,
}));

export function AdventSnow() {
  return (
    <div
      aria-hidden
      className="advent-calendar-snow pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-xl"
      data-testid="advent-calendar-snow"
    >
      {FLAKES.map((flake) => (
        <span
          key={flake.left}
          className="advent-calendar-snowfall"
          style={{
            left: `${flake.left}%`,
            animationDuration: `${flake.fall}s`,
            animationDelay: `${flake.delay}s`,
          }}
        >
          <span
            className="advent-calendar-flake"
            style={{
              width: flake.size,
              height: flake.size,
              opacity: flake.opacity,
              animationDuration: `${flake.sway}s`,
            }}
          />
        </span>
      ))}
    </div>
  );
}
