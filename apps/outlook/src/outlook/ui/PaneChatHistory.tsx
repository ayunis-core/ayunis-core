import { PaneLoadError } from '@/outlook/ui/PaneLoadError';
import { useState } from 'react';
import { Button } from '@ayunis/ui/components/button';
import { useTranslation } from 'react-i18next';
import { ConfiguredHistory, type ChatCapabilities } from '@ayunis/chat/surface';
import {
  PANE_HISTORY_PAGE_SIZE,
  usePaneHistory,
  usePaneThreadActions,
} from '@/outlook/lib/use-pane-chat-data';

export function PaneChatHistory({
  capabilities,
  onSelect,
  onError,
}: Readonly<{
  capabilities: ChatCapabilities;
  onSelect: (id: string) => void;
  onError: (error: unknown) => void;
}>) {
  const { t } = useTranslation('chats');
  const [offset, setOffset] = useState(0);
  const history = usePaneHistory(offset);
  const actions = usePaneThreadActions();
  const { t: pane } = useTranslation('outlook');
  const total = history.data?.pagination.total;
  if (total !== undefined && offset > 0 && offset >= total) {
    const lastPage = Math.floor(
      Math.max(total - 1, 0) / PANE_HISTORY_PAGE_SIZE,
    );
    setOffset(lastPage * PANE_HISTORY_PAGE_SIZE);
    return null;
  }
  const hasMore =
    total === undefined
      ? history.data?.data.length === PANE_HISTORY_PAGE_SIZE
      : offset + PANE_HISTORY_PAGE_SIZE < total;
  if (history.isError && !history.data) {
    return (
      <PaneLoadError
        onRetry={() => {
          void history.refetch();
        }}
      />
    );
  }
  if (history.isPending)
    return (
      <p role="status" className="p-4">
        {t('page.title')}
      </p>
    );
  return (
    <div className="overflow-y-auto p-4">
      <ConfiguredHistory
        chats={history.data?.data ?? []}
        capabilities={capabilities}
        onSelect={onSelect}
        rename={actions.rename}
        remove={actions.remove}
        onError={onError}
        empty={<p>{t('emptyState.title')}</p>}
        pagination={
          (offset > 0 || hasMore) && (
            <div className="mt-3 flex justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={offset === 0}
                data-testid="outlook-history-previous"
                onClick={() => setOffset(offset - PANE_HISTORY_PAGE_SIZE)}
              >
                {pane('chat.previousPage')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasMore}
                data-testid="outlook-history-next"
                onClick={() => setOffset(offset + PANE_HISTORY_PAGE_SIZE)}
              >
                {pane('chat.nextPage')}
              </Button>
            </div>
          )
        }
      />
    </div>
  );
}
