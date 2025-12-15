// Utils
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// UI
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/shared/ui/shadcn/chart';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/shared/ui/shadcn/card';

interface ProviderConsumptionChartProps {
  chartData: Array<Record<string, number | string>>;
  chartConfig: ChartConfig;
}

export function ProviderConsumptionChart({
  chartData,
  chartConfig,
}: ProviderConsumptionChartProps) {
  const { t } = useTranslation('admin-settings-usage');
  const seriesKeys = useMemo(() => Object.keys(chartConfig), [chartConfig]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('charts.providerConsumption.title')}</CardTitle>
        <CardDescription>
          {t('charts.providerConsumption.description')}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-[2.4/1] w-full">
          <AreaChart data={chartData}>
            <defs>
              {seriesKeys.map((key) => (
                <linearGradient
                  id={`fill-${key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                  key={key}
                >
                  <stop
                    offset="5%"
                    stopColor={`var(--color-${key})`}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={`var(--color-${key})`}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value as string);
                return date.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value as string).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })
                  }
                  indicator="dot"
                />
              }
            />
            {seriesKeys.map((key) => (
              <Area
                key={key}
                dataKey={key}
                type="natural"
                fill={`url(#fill-${key})`}
                stroke={`var(--color-${key})`}
                connectNulls
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
