import { Card, CardContent } from "@/shared/ui/shadcn/card";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/shared/ui/shadcn/empty";
import { UsageBlockHeader } from "./UsageBlockHeader";
import { useTranslation } from "react-i18next";
import { BarChart3 } from "lucide-react";

export function ModelDistributionEmpty() {
  const { t } = useTranslation("admin-settings-usage");

  return (
    <div>
      <UsageBlockHeader
        title={t("charts.modelDistribution.title")}
        description={t("charts.modelDistribution.description")}
      />

      <Card className="rounded-3xl border border-border/30 bg-white/70 shadow-sm backdrop-blur mt-4">
        <CardContent className="p-6">
          <Empty>
            <EmptyMedia variant="icon">
              <BarChart3 className="text-muted-foreground" />
            </EmptyMedia>

            <EmptyHeader>
              <EmptyTitle>No data available</EmptyTitle>
              <EmptyDescription>{t("charts.noData")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </div>
  );
}

