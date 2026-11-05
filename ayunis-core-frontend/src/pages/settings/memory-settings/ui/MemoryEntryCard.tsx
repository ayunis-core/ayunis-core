import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Textarea } from '@ayunis/ui/components/textarea';
import type { MemoryEntryResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

const MEMORY_CONTENT_MAX_LENGTH = 2000;

interface MemoryEntryCardProps {
  entry: MemoryEntryResponseDto;
  isSaving: boolean;
  onSave: (key: string, content: string) => void;
  onRemove: (key: string) => void;
}

export function MemoryEntryCard({
  entry,
  isSaving,
  onSave,
  onRemove,
}: Readonly<MemoryEntryCardProps>) {
  const { t, i18n } = useTranslation('settings');
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(entry.content);

  const title = entry.isReserved
    ? t(`memory.reserved.${entry.key}.title`, { defaultValue: entry.key })
    : entry.key;

  function startEditing() {
    setDraft(entry.content);
    setIsEditing(true);
  }

  function save() {
    onSave(entry.key, draft);
    setIsEditing(false);
  }

  return (
    <Card data-testid={`memory-entry-${entry.key}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{title}</CardTitle>
        {entry.isReserved && <Badge variant="secondary">{entry.key}</Badge>}
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <>
            <Textarea
              data-testid="memory-entry-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t('memory.contentPlaceholder')}
              className="min-h-32 resize-y"
              maxLength={MEMORY_CONTENT_MAX_LENGTH}
              disabled={isSaving}
            />
            <div className="text-muted-foreground text-right text-sm">
              {draft.length} / {MEMORY_CONTENT_MAX_LENGTH}
            </div>
          </>
        ) : (
          <p
            className="text-sm whitespace-pre-wrap"
            data-testid="memory-entry-content"
          >
            {entry.content || (
              <span className="text-muted-foreground">
                {t('memory.emptyEntry')}
              </span>
            )}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-sm">
            {entry.updatedAt
              ? t('memory.updatedAt', {
                  date: new Date(entry.updatedAt).toLocaleDateString(
                    i18n.language,
                  ),
                })
              : ''}
          </span>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  {t('memory.cancel')}
                </Button>
                <Button
                  data-testid="memory-entry-save"
                  size="sm"
                  onClick={save}
                  disabled={isSaving || draft === entry.content}
                >
                  {t('memory.save')}
                </Button>
              </>
            ) : (
              <>
                {entry.content && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(entry.key)}
                    disabled={isSaving}
                  >
                    {entry.isReserved ? t('memory.clear') : t('memory.delete')}
                  </Button>
                )}
                <Button
                  data-testid="memory-entry-edit"
                  variant="outline"
                  size="sm"
                  onClick={startEditing}
                  disabled={isSaving}
                >
                  {t('memory.edit')}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
