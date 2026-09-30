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
import { useAnonymousModeSettings } from '@/pages/admin-settings/anonymization-settings/api/useAnonymousModeSettings';
import { Button } from '@ayunis/ui/components/button';
import { Loader2 } from 'lucide-react';

export function AnonymousModeDefaultCard() {
  const { t } = useTranslation('admin-settings-anonymization');
  const {
    isAnonymousByDefault,
    setAnonymousByDefault,
    isLoading,
    isError,
    refetch,
    isUpdating,
  } = useAnonymousModeSettings();

  let content;
  if (isLoading) {
    content = (
      <Loader2
        className="animate-spin"
        aria-label={t('anonymousModeDefault.loading')}
      />
    );
  } else if (isError) {
    content = (
      <div role="alert">
        <p>{t('anonymousModeDefault.loadError')}</p>
        <Button variant="outline" onClick={() => void refetch()}>
          {t('anonymousModeDefault.retry')}
        </Button>
      </div>
    );
  } else {
    content = (
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
          onCheckedChange={setAnonymousByDefault}
          disabled={isUpdating}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('anonymousModeDefault.title')}</CardTitle>
        <CardDescription>
          {t('anonymousModeDefault.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
