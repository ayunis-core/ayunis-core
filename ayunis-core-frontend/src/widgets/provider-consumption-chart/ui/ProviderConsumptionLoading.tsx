import { Card, CardContent, CardHeader } from "@/shared/ui/shadcn/card";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { ProviderConsumptionHeader } from "./ProviderConsumptionHeader";
import { useTranslation } from "react-i18next";

export function ProviderConsumptionLoading() {
  const { t } = useTranslation("admin-settings-usage");

  return (
    <div>
      <ProviderConsumptionHeader
        title={t("charts.providerConsumption.title")}
        description={t("charts.providerConsumption.description")}
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

