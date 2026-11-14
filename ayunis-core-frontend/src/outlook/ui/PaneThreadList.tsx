import { useTranslation } from 'react-i18next';
import type { PaneChatApi } from '@/outlook/api/pane-chat-api';
import { usePaneThreads } from '@/outlook/lib/use-pane-threads';
import { PaneThreadRow } from '@/outlook/ui/PaneThreadRow';

export function PaneThreadList({
  api,
  onOpen,
  onFailure,
}: Readonly<{
  api: PaneChatApi;
  onOpen: (threadId: string) => void;
  onFailure: (cause: unknown) => void;
}>) {
  const { t } = useTranslation();
  const { state, actionFailed, rename, remove } = usePaneThreads(
    api,
    onFailure,
  );

  if (state.status === 'loading') {
    return <p className="text-sm text-muted-foreground">{t('pane.loading')}</p>;
  }
  if (state.status === 'failed') {
    return (
      <p className="text-sm text-destructive">{t('chat.historyFailed')}</p>
    );
  }
  if (state.threads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t('chat.historyEmpty')}</p>
    );
  }
  return (
    <>
      {actionFailed && (
        <p
          className="px-2 pb-2 text-sm text-destructive"
          data-testid="outlook-pane-thread-action-failed"
        >
          {t('chat.error.actionFailed')}
        </p>
      )}
      <ul className="flex flex-col gap-1" data-testid="outlook-pane-threads">
        {state.threads.map((thread) => (
          <li key={thread.id}>
            <PaneThreadRow
              thread={thread}
              onOpen={() => onOpen(thread.id)}
              onRename={(title) => void rename(thread.id, title)}
              onDelete={() => void remove(thread.id)}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
