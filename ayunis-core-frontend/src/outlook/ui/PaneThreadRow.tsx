import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import type { GetThreadsResponseDtoItem } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { formatRelativeDate } from '@/shared/lib/format-relative-date';

type RowMode = 'idle' | 'renaming' | 'confirmingDelete';

export function PaneThreadRow({
  thread,
  onOpen,
  onRename,
  onDelete,
}: Readonly<{
  thread: GetThreadsResponseDtoItem;
  onOpen: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}>) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<RowMode>('idle');
  const [draft, setDraft] = useState('');

  if (mode === 'renaming') {
    const submit = () => {
      const title = draft.trim();
      setMode('idle');
      if (title && title !== thread.title) onRename(title);
    };
    return (
      <form
        className="flex items-center gap-1 px-2 py-1"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          autoFocus
          className="min-w-0 flex-1 rounded-md border px-2 py-1 text-sm"
          value={draft}
          aria-label={t('chat.rename')}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === 'Escape' && setMode('idle')}
          data-testid="outlook-pane-thread-title-input"
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          aria-label={t('chat.rename')}
          data-testid="outlook-pane-thread-rename-save"
        >
          <Check />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setMode('idle')}
          aria-label={t('chat.cancel')}
        >
          <X />
        </Button>
      </form>
    );
  }

  if (mode === 'confirmingDelete') {
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        <span className="min-w-0 flex-1 truncate text-sm">
          {t('chat.confirmDelete')}
        </span>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          data-testid="outlook-pane-thread-delete-confirm"
        >
          {t('chat.delete')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setMode('idle')}>
          {t('chat.cancel')}
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-center rounded-md hover:bg-muted">
      <button
        type="button"
        className="flex min-w-0 flex-1 flex-col px-2 py-2 text-left text-sm"
        onClick={onOpen}
        data-testid="outlook-pane-thread"
      >
        <span className="w-full truncate font-medium">
          {thread.title ?? t('chat.untitled')}
        </span>
        <time
          className="text-xs text-muted-foreground"
          dateTime={thread.updatedAt}
        >
          {formatRelativeDate(thread.updatedAt, i18n.language)}
        </time>
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => {
          setDraft(thread.title ?? '');
          setMode('renaming');
        }}
        aria-label={t('chat.rename')}
        title={t('chat.rename')}
        data-testid="outlook-pane-thread-rename"
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setMode('confirmingDelete')}
        aria-label={t('chat.delete')}
        title={t('chat.delete')}
        data-testid="outlook-pane-thread-delete"
      >
        <Trash2 />
      </Button>
    </div>
  );
}
