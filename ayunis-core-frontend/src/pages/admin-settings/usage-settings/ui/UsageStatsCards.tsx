// Utils
import { useTranslation } from "react-i18next";

// Ui
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/shadcn/card";

// Api
import { useUsageStats, useUsageConfig } from "@/features/usage";

interface UsageStatsCardsProps {
  startDate?: Date;
  endDate?: Date;
}

export function UsageStatsCards({ startDate, endDate }: UsageStatsCardsProps) {
  const { t, i18n } = useTranslation("admin-settings-usage");
  const { data: config } = useUsageConfig();
  const { data: stats, isLoading } = useUsageStats({
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
  });

  const formatCompact = (value?: number) => {
    if (value === undefined) {
      return "-";
    }

    return new Intl.NumberFormat(i18n.language, {
      notation: "compact",
      maximumFractionDigits: 1,
      compactDisplay: "short",
    }).format(value);
  };

  const formatCost = (value?: number, currency?: string) => {
    if (value === undefined) {
      return "-";
    }

    const resolvedCurrency = currency || config?.defaultCurrency || "EUR";

    return new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: resolvedCurrency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("stats.totalTokens")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">
            {formatCompact(stats.totalTokens)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("stats.activeUsers")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">
            {formatCompact(stats.activeUsers)}
          </p>
        </CardContent>
      </Card>

      {config?.showCostInformation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.estimatedCost")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {formatCost(stats.totalCost, stats.currency)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
