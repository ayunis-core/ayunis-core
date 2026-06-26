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
import { Switch } from '@/shared/ui/shadcn/switch';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useOrgSystemPrompt } from '../api/useOrgSystemPrompt';
import { useOrgChatSettings } from '../api/useOrgChatSettings';

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

  const isChanged = localValue !== (systemPrompt ?? '');

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

function LoadErrorAlert({
  message,
  retryLabel,
  onRetry,
}: Readonly<{ message: string; retryLabel: string; onRetry: () => void }>) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {message}
        <Button variant="link" className="ml-2 h-auto p-0" onClick={onRetry}>
          {retryLabel}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function InstructionsCard() {
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

  let content;
  if (isError) {
    content = (
      <LoadErrorAlert
        message={t('instructions.loadError')}
        retryLabel={t('instructions.retry')}
        onRetry={() => void refetch()}
      />
    );
  } else if (isLoading) {
    content = <LoadingSpinner />;
  } else {
    content = (
      <InstructionsForm
        key={systemPrompt ?? ''}
        initialValue={systemPrompt ?? ''}
        systemPrompt={systemPrompt}
        isUpserting={isUpserting}
        isDeleting={isDeleting}
        onUpsert={upsertSystemPrompt}
        onDelete={deleteSystemPrompt}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('instructions.title')}</CardTitle>
        <CardDescription>{t('instructions.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{content}</CardContent>
    </Card>
  );
}

function InternetAccessToggle({
  internetSearchEnabled,
  isUpdating,
  onChange,
}: Readonly<{
  internetSearchEnabled: boolean;
  isUpdating: boolean;
  onChange: (internetSearchEnabled: boolean) => void;
}>) {
  const { t } = useTranslation('admin-settings-instructions');
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-1">
        <Label htmlFor="disable-internet-access-switch">
          {t('internetAccess.label')}
        </Label>
        <p className="text-sm text-muted-foreground">
          {t('internetAccess.hint')}
        </p>
      </div>
      <Switch
        id="disable-internet-access-switch"
        checked={!internetSearchEnabled}
        disabled={isUpdating}
        onCheckedChange={(checked) => onChange(!checked)}
      />
    </div>
  );
}

function InternetAccessCard() {
  const { t } = useTranslation('admin-settings-instructions');

  const {
    internetSearchEnabled,
    isLoading,
    isError,
    refetch,
    isUpdating,
    setInternetSearchEnabled,
  } = useOrgChatSettings();

  let content;
  if (isError) {
    content = (
      <LoadErrorAlert
        message={t('internetAccess.loadError')}
        retryLabel={t('internetAccess.retry')}
        onRetry={() => void refetch()}
      />
    );
  } else if (isLoading) {
    content = <LoadingSpinner />;
  } else {
    content = (
      <InternetAccessToggle
        internetSearchEnabled={internetSearchEnabled}
        isUpdating={isUpdating}
        onChange={setInternetSearchEnabled}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('internetAccess.title')}</CardTitle>
        <CardDescription>{t('internetAccess.description')}</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

export function InstructionsSettingsPage() {
  const { t: tLayout } = useTranslation('admin-settings-layout');

  return (
    <SettingsLayout title={tLayout('layout.instructions')}>
      <div className="space-y-6">
        <InstructionsCard />
        <InternetAccessCard />
      </div>
    </SettingsLayout>
  );
}
