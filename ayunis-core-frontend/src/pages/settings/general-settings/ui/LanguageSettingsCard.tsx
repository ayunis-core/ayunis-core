import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/shadcn/card";
import { Label } from "@/shared/ui/shadcn/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/shadcn/select";
import { useLanguage } from "@/features/language";
import { useTranslation } from "react-i18next";

export function LanguageSettingsCard() {
  const { t } = useTranslation("settings");
  const { language, setLanguage, availableLanguages } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("general.languageRegion")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="language-select">
              {t("general.displayLanguage")}
            </Label>
            <div className="text-sm text-muted-foreground">
              {t("general.displayLanguageDescription")}
            </div>
          </div>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger id="language-select" className="w-[180px]">
              <SelectValue placeholder={t("general.selectLanguage")} />
            </SelectTrigger>
            <SelectContent>
              {availableLanguages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
