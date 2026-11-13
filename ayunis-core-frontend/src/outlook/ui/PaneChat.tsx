import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, LogOut, SquarePen } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import type { MeResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { PaneChatApi } from '@/outlook/api/pane-chat-api';
import { SessionExpiredError } from '@/outlook/api/pane-session';
import { usePaneChat } from '@/outlook/lib/use-pane-chat';
import { PaneComposer } from '@/outlook/ui/PaneComposer';
import { PaneMessageList } from '@/outlook/ui/PaneMessageList';
import { PaneThreadList } from '@/outlook/ui/PaneThreadList';

const QUICK_ACTIONS = ['summarize', 'draftReply', 'improveDraft'] as const;

export function PaneChat({
  api,
  user,
  onSignOut,
  onSessionExpired,
}: Readonly<{
  api: PaneChatApi;
  user: MeResponseDto;
  onSignOut: () => void;
  onSessionExpired: () => void;
}>) {
  const { t } = useTranslation();
  const [showHistory, setShowHistory] = useState(false);
  const chat = usePaneChat({ api, onSessionExpired });

  function openThread(threadId: string) {
    setShowHistory(false);
    void chat.openThread(threadId);
  }

  const onHistoryFailure = useCallback(
    (cause: unknown) => {
      if (cause instanceof SessionExpiredError) onSessionExpired();
    },
    [onSessionExpired],
  );

  return (
    <main className="flex h-full flex-col" data-testid="outlook-pane-signed-in">
      <header className="flex items-center gap-1 border-b px-2 py-1">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={chat.running}
          onClick={() => {
            setShowHistory(false);
            chat.newChat();
          }}
          aria-label={t('chat.newChat')}
          title={t('chat.newChat')}
          data-testid="outlook-pane-new-chat"
        >
          <SquarePen />
        </Button>
        <Button
          variant={showHistory ? 'secondary' : 'ghost'}
          size="icon-sm"
          disabled={chat.running}
          onClick={() => setShowHistory((shown) => !shown)}
          aria-label={t('chat.history')}
          title={t('chat.history')}
          data-testid="outlook-pane-history"
        >
          <History />
        </Button>
        <span
          className="ml-auto truncate text-xs text-muted-foreground"
          title={user.email}
          data-testid="outlook-pane-user-name"
        >
          {user.name}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            chat.stop();
            onSignOut();
          }}
          aria-label={t('pane.signOut')}
          title={t('pane.signOut')}
          data-testid="outlook-pane-sign-out"
        >
          <LogOut />
        </Button>
      </header>
      <section className="flex-1 overflow-y-auto px-3 py-3">
        {showHistory ? (
          <PaneThreadList
            api={api}
            onOpen={openThread}
            onFailure={onHistoryFailure}
          />
        ) : (
          <Conversation chat={chat} />
        )}
      </section>
      {!showHistory && (
        <footer className="border-t px-3 py-2">
          <PaneComposer
            running={chat.running}
            onSend={(text) => void chat.send(text)}
            onStop={chat.stop}
          />
        </footer>
      )}
    </main>
  );
}

function Conversation({
  chat,
}: Readonly<{ chat: ReturnType<typeof usePaneChat> }>) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      {chat.messages.length === 0 && (
        <div
          className="flex flex-col gap-2"
          data-testid="outlook-pane-quick-actions"
        >
          <p className="text-sm text-muted-foreground">{t('chat.intro')}</p>
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action}
              variant="outline"
              className="justify-start"
              disabled={chat.running}
              onClick={() =>
                void chat.send(t(`chat.quickAction.${action}.prompt`))
              }
              data-testid={`outlook-pane-quick-action-${action}`}
            >
              {t(`chat.quickAction.${action}.label`)}
            </Button>
          ))}
        </div>
      )}
      <PaneMessageList messages={chat.messages} toolStates={chat.toolStates} />
      {chat.running && (
        <p
          className="text-xs text-muted-foreground"
          data-testid="outlook-pane-running"
        >
          {t('chat.thinking')}
        </p>
      )}
      {chat.error && (
        <p
          className="text-sm text-destructive"
          role="alert"
          data-testid="outlook-pane-chat-error"
        >
          {t(`chat.error.${chat.error}`)}
        </p>
      )}
    </div>
  );
}
