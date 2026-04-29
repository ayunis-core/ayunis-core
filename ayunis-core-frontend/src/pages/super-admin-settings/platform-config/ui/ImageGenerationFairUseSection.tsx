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
import { showError } from '@/shared/lib/toast';
import type { FairUseTierLimit } from '../api/useFairUseLimits';
import useImageFairUseLimit from '../api/useImageFairUseLimit';
import useSetImageFairUseLimit from '../api/useSetImageFairUseLimit';
import {
  type FairUseLimitEditState,
  isValidLimit,
  isValidWindowHours,
  toEditState,
} from '../lib/fair-use-limit-edit-state';

interface EditorProps {
  readonly current: FairUseTierLimit | undefined;
}

function Editor({ current }: EditorProps) {
  const { t } = useTranslation('super-admin-settings-platform-config');
  const [edit, setEdit] = useState<FairUseLimitEditState | null>(null);
  const { mutate, isPending } = useSetImageFairUseLimit({
    onSuccessCallback: () => setEdit(null),
  });

  const isEditing = edit !== null;
  const limitValue = isEditing ? edit.limit : String(current?.limit ?? '');
  const windowValue = isEditing
    ? edit.windowHours
    : String(current?.windowHours ?? '');

  function updateField(field: 'limit' | 'windowHours', value: string) {
    setEdit((prev) => ({ ...(prev ?? toEditState(current)), [field]: value }));
  }

  function handleSave() {
    if (!isEditing) return;

    if (!isValidLimit(edit.limit)) {
      showError(t('imageFairUseLimit.validationError.limit'));
      return;
    }
    if (!isValidWindowHours(edit.windowHours)) {
      showError(t('imageFairUseLimit.validationError.windowHours'));
      return;
    }

    mutate({
      limit: Number(edit.limit),
      windowHours: Number(edit.windowHours),
    });
  }

  function handleCancel() {
    setEdit(null);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="image-fair-use-limit">
          {t('imageFairUseLimit.limit')}
        </Label>
        <div className="w-32">
          <Input
            id="image-fair-use-limit"
            type="number"
            min="1"
            step="1"
            value={limitValue}
            onChange={(e) => updateField('limit', e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="image-fair-use-window">
          {t('imageFairUseLimit.windowHours')}
        </Label>
        <div className="w-32">
          <Input
            id="image-fair-use-window"
            type="number"
            min="0.01"
            step="any"
            value={windowValue}
            onChange={(e) => updateField('windowHours', e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>
      {isEditing && (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('imageFairUseLimit.save')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={isPending}
          >
            {t('imageFairUseLimit.cancel')}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ImageGenerationFairUseSection() {
  const { t } = useTranslation('super-admin-settings-platform-config');
  const { images, isLoading, isError } = useImageFairUseLimit();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('imageFairUseLimit.title')}</CardTitle>
        <CardDescription>{t('imageFairUseLimit.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('imageFairUseLimit.loadError')}
            </AlertDescription>
          </Alert>
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('imageFairUseLimit.loading')}
          </div>
        )}
        {!isLoading && !isError && <Editor current={images} />}
      </CardContent>
    </Card>
  );
}
