import { useCallback, useEffect, useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { activeRunsControllerCancel } from '@ayunis/api-client/endpoints';
import { SurfaceScope, type MeResponseDto } from '@ayunis/api-client/schemas';
import {
  createAuthenticatedRunEndpoints,
  createChatRunLifecycle,
} from '@ayunis/chat/runs';
import { createMemoryChatDraftStorage } from '@ayunis/chat/composer';
import { Button } from '@ayunis/ui/components/button';
import { History, LogOut, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PaneSession } from '@/outlook/api/pane-session';
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

type PaneProps = Readonly<{ user: MeResponseDto; session: PaneSession }>;

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
  return (
    <QueryClientProvider client={queryClient}>
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
  const [failedView, setFailedView] = useState<PaneView>();
  const onError = useCallback(() => setFailedView(view), [view]);
  const startAttempt = useStartPaneThread({
    lifecycle,
    draftKey: view.kind === 'new' ? view.draftKey : undefined,
    openThread: navigation.openPreparedThread,
    onError,
  });
  const capabilities = outlookChatCapabilities(user.scopes);
  const thread = usePaneThread(
    view.kind === 'thread' ? view.threadId : undefined,
  );
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PaneNavigation
        view={view}
        signOut={session.signOut}
        onShowHistory={() => {
          startAttempt.stop();
          navigation.showHistory();
        }}
        onNewChat={() => {
          const itemKey = currentOutlookItemKey();
          startAttempt.stop();
          startAttempt.stop(newChatDraftKey(itemKey));
          navigation.newChat(itemKey);
        }}
      />
      {failedView === view && (
        <div className="flex items-center justify-between gap-2 px-3 py-1">
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
      {view.kind === 'history' && (
        <PaneChatHistory
          capabilities={capabilities}
          onSelect={navigation.openThread}
          onError={onError}
        />
      )}
      {view.kind === 'new' && (
        <PaneNewChat
          key={`${view.revision}:${view.draftKey}`}
          draftKey={view.draftKey}
          drafts={drafts}
          capabilities={capabilities}
          onError={onError}
          startAttempt={startAttempt}
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
  );
}

function PaneNavigation({
  view,
  signOut,
  onNewChat,
  onShowHistory,
}: Readonly<{
  view: PaneView;
  signOut: () => Promise<void>;
  onNewChat: () => void;
  onShowHistory: () => void;
}>) {
  const { t } = useTranslation('outlook');
  return (
    <nav className="flex items-center gap-1 border-b p-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onNewChat}
        data-testid="embedded-new-chat"
      >
        <Plus /> {t('chat.newChat', { defaultValue: 'New chat' })}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onShowHistory}
        data-testid="embedded-history"
      >
        <History /> {t('chat.history', { defaultValue: 'History' })}
      </Button>
      {view.kind === 'history' && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto"
          aria-label={t('chat.signOut', { defaultValue: 'Sign out' })}
          data-testid="embedded-sign-out"
          onClick={() => {
            void signOut().catch(() => undefined);
          }}
        >
          <LogOut />
        </Button>
      )}
    </nav>
  );
}
