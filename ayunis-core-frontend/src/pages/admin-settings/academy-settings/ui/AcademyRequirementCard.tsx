import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { useAcademyAccessOrgSettings } from '../api/useAcademyAccessOrgSettings';
import { ACADEMY_ACCESS_MODE_OPTIONS } from '../model/modes';

export function AcademyRequirementCard() {
  const { t } = useTranslation('admin-settings-academy');
  const { mode, isLoading, isUpdating, setMode } =
    useAcademyAccessOrgSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('requirement.title')}</CardTitle>
        <CardDescription>{t('requirement.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {ACADEMY_ACCESS_MODE_OPTIONS.map((option) => (
            <li key={option.value}>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted">
                <input
                  type="radio"
                  name="academy-access-mode"
                  className="mt-0.5 h-4 w-4 shrink-0"
                  checked={mode === option.value}
                  disabled={isLoading || isUpdating}
                  onChange={() => setMode(option.value)}
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium">
                    {t(option.labelKey)}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {t(option.descriptionKey)}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
