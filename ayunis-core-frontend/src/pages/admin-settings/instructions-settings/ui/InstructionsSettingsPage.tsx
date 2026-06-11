import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SettingsLayout from '../../admin-settings-layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Button } from '@/shared/ui/shadcn/button';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useOrgSystemPrompt } from '../api/useOrgSystemPrompt';

function InstructionsForm({
  initialValue,
  systemPrompt,
  isUpserting,
  isDeleting,
  onUpsert,
  onDelete,
}: Readonly<{
  initialValue: string;
  systemPrompt: string | null;
  isUpserting: boolean;
  isDeleting: boolean;
  onUpsert: (value: string) => void;
  onDelete: () => void;
}>) {
  const { t } = useTranslation('admin-settings-instructions');
  const [localValue, setLocalValue] = useState(initialValue);

  const isChanged = localValue.trim() !== (systemPrompt ?? '');

  const handleSave = () => {
    if (localValue.trim()) {
      onUpsert(localValue.trim());
    } else {
      onDelete();
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="org-system-prompt-textarea">
        {t('instructions.label')}
      </Label>
      <Textarea
        id="org-system-prompt-textarea"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={t('instructions.placeholder')}
        className="min-h-32 resize-y"
        maxLength={10000}
        disabled={isUpserting || isDeleting}
      />
      <div className="flex justify-end items-center text-sm">
        <div className="flex gap-2">
          {systemPrompt && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isUpserting || isDeleting}
            >
              {isDeleting
                ? t('instructions.deleting')
                : t('instructions.delete')}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={
              !isChanged ||
              isUpserting ||
              isDeleting ||
              (!localValue.trim() && !systemPrompt)
            }
          >
            {isUpserting ? t('instructions.saving') : t('instructions.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function InstructionsSettingsPage() {
  const { t: tLayout } = useTranslation('admin-settings-layout');
  const { t } = useTranslation('admin-settings-instructions');

  const {
    systemPrompt,
    isLoading,
    isError,
    refetch,
    isUpserting,
    isDeleting,
    upsertSystemPrompt,
    deleteSystemPrompt,
  } = useOrgSystemPrompt();

  if (isError) {
    return (
      <SettingsLayout title={tLayout('layout.instructions')}>
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('instructions.loadError')}
                <Button
                  variant="link"
                  className="ml-2 h-auto p-0"
                  onClick={() => void refetch()}
                >
                  {t('instructions.retry')}
                </Button>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title={tLayout('layout.instructions')}>
      <Card>
        <CardHeader>
          <CardTitle>{t('instructions.title')}</CardTitle>
          <CardDescription>{t('instructions.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <InstructionsForm
              key={systemPrompt ?? ''}
              initialValue={systemPrompt ?? ''}
              systemPrompt={systemPrompt}
              isUpserting={isUpserting}
              isDeleting={isDeleting}
              onUpsert={upsertSystemPrompt}
              onDelete={deleteSystemPrompt}
            />
          )}
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
