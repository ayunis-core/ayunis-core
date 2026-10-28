import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Label } from '@ayunis/ui/components/label';
import { Switch } from '@ayunis/ui/components/switch';
import { useTheme } from '@/features/theme';
import { useTranslation } from 'react-i18next';
import { SettingsFieldRow } from '@/pages/settings/settings-layout';

export function ThemeSettingsCard() {
  const { t } = useTranslation('settings');
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('general.appearance')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SettingsFieldRow>
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor="dark-mode">{t('general.darkMode')}</Label>
            <div className="text-sm text-muted-foreground">
              {t('general.darkModeDescription')}
            </div>
          </div>
          <Switch
            id="dark-mode"
            className="shrink-0"
            checked={theme === 'dark'}
            onCheckedChange={handleThemeChange}
          />
        </SettingsFieldRow>
      </CardContent>
    </Card>
  );
}
