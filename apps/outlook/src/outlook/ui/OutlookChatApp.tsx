import { Toaster } from '@ayunis/ui/components/sonner';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import {
  activeRunsControllerCancel,
  useAppControllerFeatureToggles,
  useAcademyAccessControllerGetStatus,
} from '@ayunis/api-client/endpoints';
import { SurfaceScope, type MeResponseDto } from '@ayunis/api-client/schemas';
import {
  createAuthenticatedRunEndpoints,
  createChatRunLifecycle,
} from '@ayunis/chat/runs';
import { createMemoryChatDraftStorage } from '@ayunis/chat/composer';
import { Button } from '@ayunis/ui/components/button';
import { History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { OfficeAddinSession } from '@ayunis/office-addin/session';
import { currentOutlookItemKey } from '@/features/outlook-tools';
import { useStartPaneThread } from '@/outlook/lib/use-start-pane-thread';
import { outlookChatCapabilities } from '@/outlook/lib/outlook-chat-capabilities';
import { startPaneItemChats } from '@/outlook/lib/pane-item-chats';
import {
  newChatDraftKey,
  usePaneNavigation,
  type PaneView,
} from '@/outlook/lib/use-pane-navigation';
import { usePaneThread } from '@/outlook/lib/use-pane-chat-data';
import { PaneLoadError } from '@/outlook/ui/PaneLoadError';
import { PaneChatHistory } from '@/outlook/ui/PaneChatHistory';
import { PaneConversation } from '@/outlook/ui/PaneConversation';
import { PaneNewChat } from '@/outlook/ui/PaneNewChat';
import { PaneHeading } from '@/outlook/ui/PaneHeading';

type PaneProps = Readonly<{
  user: MeResponseDto;
  session: OfficeAddinSession;
}>;

function storedPaneTheme() {
  try {
    return window.localStorage.getItem('ayunis-theme') === 'dark'
      ? 'dark'
      : 'light';
  } catch {
    return 'light';
  }
}

export function OutlookChatApp({ user, session }: PaneProps) {
  const { t } = useTranslation('outlook');
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
  );
  useLayoutEffect(() => {
    const theme = storedPaneTheme();
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster theme={storedPaneTheme()} />
      {user.scopes.includes(SurfaceScope.chat) ? (
        <PaneChat user={user} session={session} />
      ) : (
        <div className="space-y-2 p-4">
          <p role="alert">{t('chat.unavailable')}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void session.signOut().catch(() => undefined);
            }}
          >
            {t('pane.signOut')}
          </Button>
        </div>
      )}
    </QueryClientProvider>
  );
}

function usePaneRuntime({ user, session }: PaneProps) {
  const [transport] = useState(() =>
    createAuthenticatedRunEndpoints(
      session.transport.fetch,
      activeRunsControllerCancel,
    ),
  );
  const [lifecycle] = useState(() => createChatRunLifecycle(transport));
  const [drafts] = useState(createMemoryChatDraftStorage);
  const queryClient = useQueryClient();
  const { view, navigation } = usePaneNavigation(drafts);
  useEffect(
    () => startPaneItemChats(navigation, queryClient, user.id),
    [navigation, queryClient, user.id],
  );
  useEffect(
    () =>
      session.onEnd(() => {
        lifecycle.reset();
        queryClient.clear();
      }),
    [session, lifecycle, queryClient],
  );
  return { transport, lifecycle, drafts, view, navigation };
}

function PaneChat(props: PaneProps) {
  const { session, user } = props;
  const runtime = usePaneRuntime(props);
  const { view, navigation, lifecycle, transport, drafts } = runtime;
  const { t } = useTranslation('outlook');
  const { t: chat } = useTranslation('chat');
  const [failedView, setFailedView] = useState<PaneView>();
  const onError = useCallback(() => setFailedView(view), [view]);
  const startAttempt = useStartPaneThread({
    lifecycle,
    draftKey: view.kind === 'new' ? view.draftKey : undefined,
    openThread: navigation.openPreparedThread,
    onError,
  });
  const toggles = useAppControllerFeatureToggles();
  const academy = useAcademyAccessControllerGetStatus({
    query: {
      enabled: user.scopes.includes(SurfaceScope['academy:read']),
      retry: false,
    },
  });
  const isAcademyGated = academy.data?.allowed === false;
  const capabilities = {
    ...outlookChatCapabilities(user.scopes),
    voice:
      user.scopes.includes(SurfaceScope.voice) &&
      toggles.data?.voiceEnabled === true,
  };
  const thread = usePaneThread(
    view.kind === 'thread' ? view.threadId : undefined,
  );
  function showHistory() {
    startAttempt.stop();
    navigation.showHistory();
  }

  function startNewChat() {
    const itemKey = currentOutlookItemKey();
    startAttempt.stop();
    startAttempt.stop(newChatDraftKey(itemKey));
    navigation.newChat(itemKey);
  }

  return (
    <div className="outlook-pane flex h-full min-h-0 flex-col bg-background">
      {failedView === view && (
        <div className="z-20 flex items-center justify-between gap-2 px-3 py-1">
          <p role="alert" className="text-sm text-destructive">
            {t('chat.requestFailed')}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFailedView(undefined)}
          >
            {t('chat.dismiss')}
          </Button>
        </div>
      )}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {view.kind === 'history' && (
          <PaneChatHistory
            capabilities={capabilities}
            onBack={() => navigation.startNewChat(currentOutlookItemKey())}
            onSignOut={session.signOut}
            session={lifecycle.getSessionSignal()}
            onSelect={navigation.openThread}
            onError={onError}
          />
        )}
        {view.kind === 'new' && (
          <PaneNewChat
            key={`${view.revision}:${view.draftKey}`}
            draftKey={view.draftKey}
            header={
              <PaneHeading
                title={chat('newChat.newChat')}
                actions={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={chat('chat.chats')}
                    data-testid="embedded-history"
                    onClick={showHistory}
                  >
                    <History className="h-5 w-5" />
                  </Button>
                }
              />
            }
            drafts={drafts}
            capabilities={capabilities}
            onError={onError}
            startAttempt={startAttempt}
            isAcademyGated={isAcademyGated}
            canReadDefaults={user.scopes.includes(
              SurfaceScope['chat-settings:read'],
            )}
          />
        )}
        {view.kind === 'thread' && (
          <div className="min-h-0 flex-1" data-testid="outlook-conversation">
            {thread.data ? (
              <PaneConversation
                userId={user.id}
                thread={thread.data}
                config={{ transport, capabilities }}
                lifecycle={lifecycle}
                drafts={drafts}
                isAcademyGated={isAcademyGated}
                onNewChat={startNewChat}
                onDeleted={navigation.showHistoryAfterDelete}
                onError={onError}
              />
            ) : thread.isError ? (
              <PaneLoadError
                onRetry={() => {
                  void thread.refetch();
                }}
                testId="outlook-thread-retry"
              />
            ) : (
              <p role="status" className="p-4">
                {t('pane.loading')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
