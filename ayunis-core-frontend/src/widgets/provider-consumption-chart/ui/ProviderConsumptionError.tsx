import { Card, CardContent } from "@/shared/ui/shadcn/card";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/shared/ui/shadcn/empty";
import { ProviderConsumptionHeader } from "./ProviderConsumptionHeader";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";

interface ProviderConsumptionErrorProps {
  error: unknown;
}

export function ProviderConsumptionError({ error }: ProviderConsumptionErrorProps) {
  const { t } = useTranslation("admin-settings-usage");
  const errorMessage = error instanceof Error ? error.message : "Unknown error";

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
              <AlertCircle className="text-destructive" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>Error loading data</EmptyTitle>
              <EmptyDescription>{errorMessage}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </div>
  );
}

