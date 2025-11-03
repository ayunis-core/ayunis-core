// Utils
import { useTranslation } from "react-i18next";

// UI
import { Card, CardContent } from "@/shared/ui/shadcn/card";

interface ModelsEmptyStateProps {
  tab: "recommended" | "self";
}

export default function ModelsEmptyState({ tab }: ModelsEmptyStateProps) {
  const { t } = useTranslation("admin-settings-models");

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <h3 className="text-lg font-semibold mb-2">
            {tab === "recommended"
              ? t("models.emptyState.recommended.title")
              : t("models.emptyState.selfHosted.title")}
          </h3>
          <p className="text-muted-foreground">
            {tab === "recommended"
              ? t("models.emptyState.recommended.description")
              : t("models.emptyState.selfHosted.description")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

