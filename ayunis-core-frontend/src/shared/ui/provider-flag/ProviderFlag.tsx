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

const SIZE = 512;
const CENTER = SIZE / 2;

const RED = '#d80027';
const GOLD = '#ffda44';
const BLUE = '#0052b4';
const WHITE = '#f0f0f0';
const NAVY = '#41479b';

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
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    angle += step;
  }
  return points.join(' ');
}

const EU_STAR_POINTS: string[] = Array.from({ length: 12 }, (_, i) => {
  const angle = -Math.PI / 2 + (i * Math.PI) / 6;
  const cx = CENTER + 172 * Math.cos(angle);
  const cy = CENTER + 172 * Math.sin(angle);
  return starPoints(cx, cy, 30, 12);
});

const US_STRIPE_HEIGHT = SIZE / 13;
const US_CANTON_SIZE = US_STRIPE_HEIGHT * 7;

const US_STAR_POINTS: string[] = Array.from({ length: 7 }, (_, row) => {
  const cy = 30 + row * 38;
  const offset = row % 2 === 0 ? 50 : 18;
  return Array.from({ length: 4 }, (_, col) => offset + col * 65)
    .filter((cx) => cx < US_CANTON_SIZE - 12)
    .map((cx) => starPoints(cx, cy, 18, 7));
}).flat();

function GermanyFlag() {
  return (
    <>
      <rect width={SIZE} height={SIZE} fill={GOLD} />
      <rect width={SIZE} height={(SIZE * 2) / 3} fill={RED} />
      <rect width={SIZE} height={SIZE / 3} fill="#000000" />
    </>
  );
}

function EuropeanUnionFlag() {
  return (
    <>
      <rect width={SIZE} height={SIZE} fill={BLUE} />
      {EU_STAR_POINTS.map((points) => (
        <polygon key={points} points={points} fill={GOLD} />
      ))}
    </>
  );
}

function UnitedStatesFlag() {
  return (
    <>
      <rect width={SIZE} height={SIZE} fill={WHITE} />
      {Array.from({ length: 7 }, (_, i) => (
        <rect
          key={i}
          y={i * 2 * US_STRIPE_HEIGHT}
          width={SIZE}
          height={US_STRIPE_HEIGHT}
          fill={RED}
        />
      ))}
      <rect width={US_CANTON_SIZE} height={US_CANTON_SIZE} fill={NAVY} />
      {US_STAR_POINTS.map((points) => (
        <polygon key={points} points={points} fill={WHITE} />
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
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={cn(
        'inline-block size-4 shrink-0 overflow-hidden rounded-full',
        className,
      )}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <FlagShape />
    </svg>
  );
}

export default ProviderFlag;
