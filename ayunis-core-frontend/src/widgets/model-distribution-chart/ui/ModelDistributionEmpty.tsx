import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/shadcn/card";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/shared/ui/shadcn/empty";
import { useTranslation } from "react-i18next";
import { BarChart3 } from "lucide-react";

export function ModelDistributionEmpty() {
  const { t } = useTranslation("admin-settings-usage");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("charts.modelDistribution.title")}</CardTitle>
        <CardDescription>{t("charts.modelDistribution.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Empty>
          <EmptyMedia variant="icon">
            <BarChart3 className="text-muted-foreground" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{t("charts.noData")}</EmptyTitle>
            <EmptyDescription>{t("charts.noDataDescription")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );
}
