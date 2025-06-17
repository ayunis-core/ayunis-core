import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/shadcn/card";
import { Label } from "@/shared/ui/shadcn/label";
import { Switch } from "@/shared/ui/shadcn/switch";
import { useTheme } from "@/features/theme";
import { useTranslation } from "react-i18next";

export function ThemeSettingsCard() {
  const { t } = useTranslation("settings");
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("general.appearance")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="dark-mode">{t("general.darkMode")}</Label>
            <div className="text-sm text-muted-foreground">
              {t("general.darkModeDescription")}
            </div>
          </div>
          <Switch
            id="dark-mode"
            checked={theme === "dark"}
            onCheckedChange={handleThemeChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
