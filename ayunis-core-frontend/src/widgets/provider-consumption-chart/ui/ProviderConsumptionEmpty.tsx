import { Card, CardContent } from "@/shared/ui/shadcn/card";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/shared/ui/shadcn/empty";
import { ProviderConsumptionHeader } from "./ProviderConsumptionHeader";
import { useTranslation } from "react-i18next";
import { BarChart3 } from "lucide-react";

export function ProviderConsumptionEmpty() {
  const { t } = useTranslation("admin-settings-usage");

  return (
    <div>
      <ProviderConsumptionHeader
        title={t("charts.providerConsumption.title")}
        description={t("charts.providerConsumption.description")}
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

