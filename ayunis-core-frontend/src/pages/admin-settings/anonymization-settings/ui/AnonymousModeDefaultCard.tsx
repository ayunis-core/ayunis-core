import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Label } from '@ayunis/ui/components/label';
import { Switch } from '@ayunis/ui/components/switch';
import { useAnonymousModeDefault } from '@/features/anonymous-mode-default';
import { showSuccess } from '@/shared/lib/toast';

export function AnonymousModeDefaultCard() {
  const { t } = useTranslation('admin-settings-anonymization');
  const { isAnonymousByDefault, setAnonymousByDefault } =
    useAnonymousModeDefault();

  function handleChange(checked: boolean) {
    setAnonymousByDefault(checked);
    showSuccess(t('anonymousModeDefault.saved'));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('anonymousModeDefault.title')}</CardTitle>
        <CardDescription>
          {t('anonymousModeDefault.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="anonymous-mode-default-switch">
              {t('anonymousModeDefault.label')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('anonymousModeDefault.hint')}
            </p>
          </div>
          <Switch
            id="anonymous-mode-default-switch"
            data-testid="anonymization-default-switch"
            checked={isAnonymousByDefault}
            onCheckedChange={handleChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
