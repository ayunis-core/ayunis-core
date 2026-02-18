import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Button } from '@/shared/ui/shadcn/button';
import { useTranslation } from 'react-i18next';
import { useUserSystemPrompt } from '../api/useUserSystemPrompt';
import { useState } from 'react';

function SystemPromptForm({
  initialValue,
  systemPrompt,
  isUpserting,
  isDeleting,
  onUpsert,
  onDelete,
}: {
  initialValue: string;
  systemPrompt: string | null;
  isUpserting: boolean;
  isDeleting: boolean;
  onUpsert: (value: string) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation('settings');
  const [localValue, setLocalValue] = useState(initialValue);

  const isChanged = localValue !== (systemPrompt ?? '');

  const handleSave = () => {
    if (localValue.trim()) {
      onUpsert(localValue.trim());
    } else {
      onDelete();
    }
  };

  const handleDelete = () => {
    onDelete();
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="system-prompt-textarea">
        {t('chat.systemPromptLabel')}
      </Label>
      <div className="text-sm text-muted-foreground">
        {t('chat.systemPromptDescription')}
      </div>
      <Textarea
        id="system-prompt-textarea"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={t('chat.systemPromptPlaceholder')}
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
              onClick={handleDelete}
              disabled={isUpserting || isDeleting}
            >
              {isDeleting ? 'Removing...' : t('chat.deleteSystemPrompt')}
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
            {isUpserting ? 'Saving...' : t('chat.saveSystemPrompt')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SystemPromptCard() {
  const { t } = useTranslation('settings');

  const {
    systemPrompt,
    isLoading,
    isUpserting,
    isDeleting,
    upsertSystemPrompt,
    deleteSystemPrompt,
  } = useUserSystemPrompt();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('chat.systemPromptTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <SystemPromptForm
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
  );
}
