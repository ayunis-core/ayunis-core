import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Input } from '@/shared/ui/shadcn/input';
import { Button } from '@/shared/ui/shadcn/button';
import { Label } from '@/shared/ui/shadcn/label';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/shared/lib/toast';
import useCreditsPerEuro from '../api/useCreditsPerEuro';
import useSetCreditsPerEuro from '../api/useSetCreditsPerEuro';

export default function CreditsPerEuroSection() {
  const { t } = useTranslation('super-admin-settings-platform-config');
  const { creditsPerEuro, isLoading, isError } = useCreditsPerEuro();
  const { mutate, isPending } = useSetCreditsPerEuro();
  const [editValue, setEditValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const displayValue = isEditing ? editValue : String(creditsPerEuro ?? '');

  function handleSave() {
    const parsed = Number(editValue);
    if (isNaN(parsed) || parsed <= 0) {
      showError(t('creditsPerEuro.validationError'));
      return;
    }

    mutate(parsed, {
      onSuccess: () => {
        showSuccess(t('creditsPerEuro.updateSuccess'));
        setIsEditing(false);
      },
      onError: () => {
        showError(t('creditsPerEuro.updateError'));
      },
    });
  }

  function handleCancel() {
    setIsEditing(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('creditsPerEuro.title')}</CardTitle>
        <CardDescription>{t('creditsPerEuro.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t('creditsPerEuro.loadError')}</AlertDescription>
          </Alert>
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('creditsPerEuro.loading')}
          </div>
        )}
        {!isLoading && !isError && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="credits-per-euro">
                {t('creditsPerEuro.label')}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="credits-per-euro"
                  type="number"
                  min="0.01"
                  step="any"
                  value={displayValue}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    if (!isEditing) setIsEditing(true);
                  }}
                  className="max-w-xs"
                  disabled={isPending}
                />
                {isEditing && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={isPending}>
                      {isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {t('creditsPerEuro.save')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isPending}
                    >
                      {t('creditsPerEuro.cancel')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('creditsPerEuro.hint')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
