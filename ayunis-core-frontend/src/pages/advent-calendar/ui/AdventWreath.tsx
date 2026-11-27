import { useTranslation } from 'react-i18next';
import { cn } from '@ayunis/ui/lib/cn';

const CANDLES = [
  { x: 40, base: 92 },
  { x: 76, base: 80 },
  { x: 110, base: 80 },
  { x: 146, base: 92 },
] as const;
const CANDLE_WIDTH = 14;
const CANDLE_HEIGHT = 42;

interface AdventWreathProps {
  litCandles: number;
  className?: string;
}

export function AdventWreath({
  litCandles,
  className,
}: Readonly<AdventWreathProps>) {
  const { t } = useTranslation('advent-calendar');
  return (
    <svg
      viewBox="0 0 200 120"
      role="img"
      aria-label={t('wreath.label', { count: litCandles })}
      className={cn('w-full', className)}
      data-testid="advent-calendar-wreath"
      data-lit-candles={litCandles}
    >
      <ellipse
        cx="100"
        cy="94"
        rx="82"
        ry="20"
        className="fill-none stroke-chart-2"
        strokeWidth="14"
      />
      {CANDLES.map(({ x, base }, index) => {
        const lit = index < litCandles;
        const top = base - CANDLE_HEIGHT;
        return (
          <g
            key={x}
            data-testid="advent-calendar-candle"
            data-lit={lit}
            className="advent-calendar-candle"
          >
            <rect
              x={x}
              y={top}
              width={CANDLE_WIDTH}
              height={CANDLE_HEIGHT}
              rx="2"
              className={cn('fill-brand', !lit && 'opacity-60')}
            />
            <line
              x1={x + CANDLE_WIDTH / 2}
              y1={top}
              x2={x + CANDLE_WIDTH / 2}
              y2={top - 4}
              className="stroke-foreground"
              strokeWidth="1.5"
            />
            {lit && (
              <ellipse
                cx={x + CANDLE_WIDTH / 2}
                cy={top - 10}
                rx="4"
                ry="7"
                className="advent-calendar-flame fill-warning"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
