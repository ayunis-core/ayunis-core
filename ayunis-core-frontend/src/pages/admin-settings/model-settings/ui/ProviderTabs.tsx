import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";
import { useTranslation } from "react-i18next";

interface ProviderTabsProps {
  selected: "recommended" | "self";
  onChange: (value: "recommended" | "self") => void;
}

export default function ProviderTabs({ selected, onChange }: ProviderTabsProps) {
  const { t } = useTranslation("admin-settings-models");

  return (
    <Tabs value={selected} onValueChange={(v) => onChange(v as any)}>
      <TabsList>
        <TabsTrigger className="text-sm font-normal" value="recommended">{t("models.tabs.recommended")}</TabsTrigger>
        <TabsTrigger className="text-sm font-normal" value="self">{t("models.tabs.self")}</TabsTrigger>
      </TabsList>
      <TabsContent value={selected} />
    </Tabs>
  );
}


