import { Card, CardContent, CardHeader } from "@/shared/ui/shadcn/card";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { UsageBlockHeader } from "./UsageBlockHeader";
import { useTranslation } from "react-i18next";

export function ModelDistributionLoading() {
  const { t } = useTranslation("admin-settings-usage");

  return (
    <div>
      <UsageBlockHeader
        title={t("charts.modelDistribution.title")}
        description={t("charts.modelDistribution.description")}
      />
      <Card className="rounded-3xl border border-border/30 bg-white/70 shadow-sm backdrop-blur mt-4">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

