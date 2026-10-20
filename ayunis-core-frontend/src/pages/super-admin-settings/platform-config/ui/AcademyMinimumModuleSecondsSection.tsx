import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Input } from '@ayunis/ui/components/input';
import { Button } from '@ayunis/ui/components/button';
import { Label } from '@ayunis/ui/components/label';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { showError } from '@/shared/lib/toast';
import useAcademyMinimumModuleSeconds from '@/pages/super-admin-settings/platform-config/api/useAcademyMinimumModuleSeconds';
import useSetAcademyMinimumModuleSeconds from '@/pages/super-admin-settings/platform-config/api/useSetAcademyMinimumModuleSeconds';

export default function AcademyMinimumModuleSecondsSection() {
  const { t } = useTranslation('super-admin-settings-platform-config');
  const { seconds, isLoading, isError } = useAcademyMinimumModuleSeconds();
  const { mutate, isPending } = useSetAcademyMinimumModuleSeconds();
  const [editValue, setEditValue] = useState<string | null>(null);

  const displayValue = editValue ?? String(seconds ?? '');

  function handleSave() {
    const parsed = Number(displayValue);
    if (displayValue.trim() === '' || !Number.isInteger(parsed) || parsed < 0) {
      showError(t('academyMinimumModuleSeconds.validationError'));
      return;
    }
    mutate(parsed, { onSuccess: () => setEditValue(null) });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('academyMinimumModuleSeconds.title')}</CardTitle>
        <CardDescription>
          {t('academyMinimumModuleSeconds.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('academyMinimumModuleSeconds.loadError')}
            </AlertDescription>
          </Alert>
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('academyMinimumModuleSeconds.loading')}
          </div>
        )}
        {!isLoading && !isError && (
          <div className="space-y-2">
            <Label htmlFor="academy-minimum-module-seconds">
              {t('academyMinimumModuleSeconds.label')}
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="academy-minimum-module-seconds"
                data-testid="academy-minimum-module-seconds-input"
                type="number"
                min="0"
                step="1"
                value={displayValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="max-w-xs"
                disabled={isPending}
              />
              {editValue !== null && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={isPending}>
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t('academyMinimumModuleSeconds.save')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditValue(null)}
                    disabled={isPending}
                  >
                    {t('academyMinimumModuleSeconds.cancel')}
                  </Button>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('academyMinimumModuleSeconds.hint')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
