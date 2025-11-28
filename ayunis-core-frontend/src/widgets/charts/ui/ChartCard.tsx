// Utils
import { useMemo } from 'react';
import { cn } from '@/shared/lib/shadcn/utils';

// UI
import { ChartContainer, type ChartConfig } from '@/shared/ui/shadcn/chart';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/shared/ui/shadcn/card';

type ChartCardProps = {
  title?: string;
  insight?: string;
  config: ChartConfig;
  className?: string;
  xCount?: number;
  threshold?: number;
  perPointPx?: number;
  children: React.ComponentProps<typeof ChartContainer>['children'];
};

export function ChartCard({
  title,
  insight,
  config,
  className,
  xCount,
  threshold = 10,
  perPointPx = 70,
  children,
}: ChartCardProps) {
  const dynamicWidth = useMemo(() => {
    if (!xCount) {
      return undefined;
    }

    return xCount > threshold ? xCount * perPointPx : undefined;
  }, [xCount, threshold, perPointPx]);

  return (
    <Card className={cn('my-2', className)}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}

      <CardContent className="overflow-auto">
        <ChartContainer
          className="min-h-[300px] max-h-[400px]"
          style={dynamicWidth ? { width: dynamicWidth } : undefined}
          config={config}
        >
          {children}
        </ChartContainer>
      </CardContent>

      {insight && insight.trim() && (
        <CardFooter>
          <p className="text-sm text-muted-foreground">{insight}</p>
        </CardFooter>
      )}
    </Card>
  );
}
