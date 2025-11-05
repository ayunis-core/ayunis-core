// Utils
import { useTranslation } from "react-i18next";

// Ui
import { Skeleton } from "@/shared/ui/shadcn/skeleton";

// Api
import { useUsageStats, useUsageConfig } from "@/entities/usage";

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
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          {t("stats.totalTokens")}
        </p>
        <p className="mt-2 text-xl font-semibold">
          {formatCompact(stats.totalTokens)}
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-muted-foreground">
          {t("stats.activeUsers")}
        </p>
        <p className="mt-2 text-xl font-semibold">
          {formatCompact(stats.activeUsers)}
        </p>
      </div>

      {config?.showCostInformation && (
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {t("stats.estimatedCost")}
          </p>
          <p className="mt-2 text-xl font-semibold">
            {formatCost(stats.totalCost, stats.currency)}
          </p>
        </div>
      )}
    </div>
  );
}
