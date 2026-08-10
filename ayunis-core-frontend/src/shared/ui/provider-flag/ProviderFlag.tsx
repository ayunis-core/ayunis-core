import { cn } from '@ayunis/ui/lib/cn';
import {
  getFlagCodeByProvider,
  type ProviderFlagCode,
} from '@/shared/lib/model-provider-metadata';
import type { ModelProviderInfoResponseDtoProvider } from '@/shared/api/generated/ayunisCoreAPI.schemas';

// Flags are drawn as inline SVGs instead of Unicode flag emoji. Windows
// (Microsoft Edge and Chrome) does not ship glyphs for regional-indicator
// emoji, so emoji flags degrade to letter pairs (e.g. "DE") there. SVGs render
// identically on every browser and OS.

// A five-pointed star centred on (cx, cy) with a point facing up.
function starPoints(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
): string {
  const points: string[] = [];
  const step = Math.PI / 5;
  let angle = -Math.PI / 2;
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    points.push(`${x.toFixed(3)},${y.toFixed(3)}`);
    angle += step;
  }
  return points.join(' ');
}

// viewBox is 3 x 2 (the 3:2 aspect used by most national flags).
const EU_STAR_POINTS: string[] = Array.from({ length: 12 }, (_, i) => {
  const angle = -Math.PI / 2 + (i * Math.PI) / 6;
  const cx = 1.5 + 0.63 * Math.cos(angle);
  const cy = 1 + 0.63 * Math.sin(angle);
  return starPoints(cx, cy, 0.14, 0.056);
});

// 50 stars in the 9-row (6/5 alternating) canton layout, generated once.
const US_STAR_POINTS: string[] = (() => {
  const cantonWidth = 1.2;
  const cantonHeight = (7 * 2) / 13;
  const colUnit = cantonWidth / 12;
  const rowUnit = cantonHeight / 10;
  const stars: string[] = [];
  for (let row = 0; row < 9; row++) {
    const cols = row % 2 === 0 ? [1, 3, 5, 7, 9, 11] : [2, 4, 6, 8, 10];
    for (const col of cols) {
      stars.push(starPoints(col * colUnit, (row + 1) * rowUnit, 0.036, 0.015));
    }
  }
  return stars;
})();

function GermanyFlag() {
  return (
    <>
      <rect width="3" height="2" fill="#ffce00" />
      <rect width="3" height="1.333" fill="#dd0000" />
      <rect width="3" height="0.667" fill="#000000" />
    </>
  );
}

function EuropeanUnionFlag() {
  return (
    <>
      <rect width="3" height="2" fill="#003399" />
      {EU_STAR_POINTS.map((points) => (
        <polygon key={points} points={points} fill="#ffcc00" />
      ))}
    </>
  );
}

function UnitedStatesFlag() {
  const stripeHeight = 2 / 13;
  return (
    <>
      <rect width="3" height="2" fill="#ffffff" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect
          key={i}
          y={i * 2 * stripeHeight}
          width="3"
          height={stripeHeight}
          fill="#b22234"
        />
      ))}
      <rect width="1.2" height={7 * stripeHeight} fill="#3c3b6e" />
      {US_STAR_POINTS.map((points) => (
        <polygon key={points} points={points} fill="#ffffff" />
      ))}
    </>
  );
}

const FLAG_RENDERERS: Record<ProviderFlagCode, () => React.ReactElement> = {
  DE: GermanyFlag,
  EU: EuropeanUnionFlag,
  US: UnitedStatesFlag,
};

interface ProviderFlagProps {
  provider: ModelProviderInfoResponseDtoProvider;
  className?: string;
}

// Decorative: hosting region is also conveyed by list ordering and the hosting
// text in the model info card, so the flag is hidden from assistive tech.
export function ProviderFlag({
  provider,
  className,
}: Readonly<ProviderFlagProps>) {
  const code = getFlagCodeByProvider(provider);
  if (!code) return null;
  const FlagShape = FLAG_RENDERERS[code];

  return (
    <svg
      viewBox="0 0 3 2"
      className={cn(
        'inline-block shrink-0 overflow-hidden rounded-[2px] align-[-0.1em] ring-1 ring-border',
        className,
      )}
      // Dimensions are set inline rather than via h-/w- utilities: the Select
      // primitives force descendant SVGs without a size- class to `size-4`
      // (a higher-specificity rule), which would crop the 3:2 flag to a
      // square. Inline styles win over that class-based override.
      style={{ height: '0.9em', width: '1.35em' }}
      role="presentation"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
    >
      <FlagShape />
    </svg>
  );
}

export default ProviderFlag;
