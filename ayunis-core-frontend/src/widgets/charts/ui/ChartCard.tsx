// Utils
import { useMemo } from 'react';
import { cn } from '@/shared/lib/shadcn/utils';
import { useDownloadChartImage } from '@/widgets/charts/lib/useDownloadChartImage';

// UI
import { ChartContainer, type ChartConfig } from '@/shared/ui/shadcn/chart';
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
  CardFooter,
} from '@/shared/ui/shadcn/card';
import { Button } from '@/shared/ui/shadcn/button';
import { Download, Loader2 } from 'lucide-react';

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
}: Readonly<ChartCardProps>) {
  const { chartRef, download, isDownloading } = useDownloadChartImage(title);

  const dynamicWidth = useMemo(() => {
    if (!xCount) {
      return undefined;
    }

    return xCount > threshold ? xCount * perPointPx : undefined;
  }, [xCount, threshold, perPointPx]);

  return (
    <Card className={cn('my-2', className)} ref={chartRef}>
      <CardHeader>
        {title && <CardTitle>{title}</CardTitle>}
        <CardAction data-exclude-from-export>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void download()}
            disabled={isDownloading}
            aria-label="Download chart as image"
          >
            {isDownloading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Download />
            )}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="overflow-auto">
        <ChartContainer
          className="min-h-[300px] max-h-[400px]"
          style={dynamicWidth ? { width: dynamicWidth } : undefined}
          config={config}
        >
          {children}
        </ChartContainer>
      </CardContent>

      {insight?.trim() && (
        <CardFooter>
          <p className="text-sm text-muted-foreground">{insight}</p>
        </CardFooter>
      )}
    </Card>
  );
}
