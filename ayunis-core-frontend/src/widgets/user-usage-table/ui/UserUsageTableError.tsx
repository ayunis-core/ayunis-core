import { useTranslation } from "react-i18next";

interface UserUsageTableErrorProps {
  error: unknown;
}

export function UserUsageTableError({ error: _error }: UserUsageTableErrorProps) {
  const { t } = useTranslation("admin-settings-usage");

  return (
    <div>
      <h2 className="text-base font-semibold">{t("userUsage.title")}</h2>
      <p className="text-sm text-muted-foreground mt-1">
        {t("userUsage.error")}
      </p>
    </div>
  );
}

