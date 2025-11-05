import { useTranslation } from "react-i18next";

export function UserUsageTableEmpty() {
  const { t } = useTranslation("admin-settings-usage");

  return (
    <div>
      <h2 className="text-base font-semibold">{t("userUsage.title")}</h2>
      <p className="text-sm text-muted-foreground mt-1">{t("userUsage.noData")}</p>
    </div>
  );
}

