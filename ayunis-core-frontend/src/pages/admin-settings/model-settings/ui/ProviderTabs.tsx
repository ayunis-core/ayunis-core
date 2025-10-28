import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";
import { useTranslation } from "react-i18next";

interface ProviderTabsProps {
  selected: "enabled" | "eu" | "intl" | "self";
  onChange: (value: "enabled" | "eu" | "intl" | "self") => void;
}

export default function ProviderTabs({ selected, onChange }: ProviderTabsProps) {
  const { t } = useTranslation("admin-settings-models");

  return (
    <Tabs value={selected} onValueChange={(v) => onChange(v as any)}>
      <TabsList>
        <TabsTrigger className="text-sm font-normal" value="enabled">{t("models.tabs.enabled")}</TabsTrigger>
        <TabsTrigger className="text-sm font-normal" value="eu">🇪🇺 {t("models.tabs.eu")}</TabsTrigger>
        <TabsTrigger className="text-sm font-normal" value="intl">🇺🇸 {t("models.tabs.intl")}</TabsTrigger>
        <TabsTrigger className="text-sm font-normal" value="self">🇩🇪 {t("models.tabs.self")}</TabsTrigger>
      </TabsList>
      <TabsContent value={selected} />
    </Tabs>
  );
}


