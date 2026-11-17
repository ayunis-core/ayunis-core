import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GetThreadsResponseDtoItem } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { PaneChatApi } from '@/outlook/api/pane-chat-api';
import { formatRelativeDate } from '@/shared/lib/format-relative-date';

type ListState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'loaded'; threads: GetThreadsResponseDtoItem[] };

export function PaneThreadList({
  api,
  onOpen,
  onFailure,
}: Readonly<{
  api: PaneChatApi;
  onOpen: (threadId: string) => void;
  onFailure: (cause: unknown) => void;
}>) {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<ListState>({ status: 'loading' });

  useEffect(() => {
    let current = true;
    api.listThreads().then(
      (threads) => current && setState({ status: 'loaded', threads }),
      (cause: unknown) => {
        if (!current) return;
        setState({ status: 'failed' });
        onFailure(cause);
      },
    );
    return () => {
      current = false;
    };
  }, [api, onFailure]);

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
    <ul className="flex flex-col gap-1" data-testid="outlook-pane-threads">
      {state.threads.map((thread) => (
        <li key={thread.id}>
          <button
            type="button"
            className="flex w-full flex-col rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
            onClick={() => onOpen(thread.id)}
            data-testid="outlook-pane-thread"
          >
            <span className="truncate font-medium">
              {thread.title ?? t('chat.untitled')}
            </span>
            <time
              className="text-xs text-muted-foreground"
              dateTime={thread.updatedAt}
            >
              {formatRelativeDate(thread.updatedAt, i18n.language)}
            </time>
          </button>
        </li>
      ))}
    </ul>
  );
}
