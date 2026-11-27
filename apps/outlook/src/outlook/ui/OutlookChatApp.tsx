import { Toaster } from '@ayunis/ui/components/sonner';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ComponentProps,
} from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import {
  activeRunsControllerCancel,
  getThreadsControllerFindOneQueryKey,
} from '@ayunis/api-client/endpoints';
import { SurfaceScope, type MeResponseDto } from '@ayunis/api-client/schemas';
import {
  createAuthenticatedRunEndpoints,
  createChatRunLifecycle,
} from '@ayunis/chat/runs';
import { createMemoryChatDraftStorage } from '@ayunis/chat/composer';
import { stopChatStart, type ChatStarted } from '@ayunis/chat/surface';
import { Button } from '@ayunis/ui/components/button';
import { History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { OfficeAddinSession } from '@ayunis/office-addin/session';
import { currentOutlookItemKey } from '@/features/outlook-tools';
import { startPaneItemChats } from '@/outlook/lib/pane-item-chats';
import {
  newChatDraftKey,
  usePaneNavigation,
  type PaneView,
} from '@/outlook/lib/use-pane-navigation';
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

type PaneRuntime = ReturnType<typeof usePaneRuntime>;

function PaneRequestFailed({ onDismiss }: Readonly<{ onDismiss: () => void }>) {
  const { t } = useTranslation('outlook');
  return (
    <div className="z-20 flex items-center justify-between gap-2 px-3 py-1">
      <p role="alert" className="text-sm text-destructive">
        {t('chat.requestFailed')}
      </p>
      <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
        {t('chat.dismiss')}
      </Button>
    </div>
  );
}

function NewChatHeading({ onHistory }: Readonly<{ onHistory: () => void }>) {
  const { t } = useTranslation('chat');
  return (
    <PaneHeading
      title={t('newChat.newChat')}
      actions={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('chat.chats')}
          data-testid="embedded-history"
          onClick={onHistory}
        >
          <History className="h-5 w-5" />
        </Button>
      }
    />
  );
}

interface PaneViewProps {
  readonly user: MeResponseDto;
  readonly session: OfficeAddinSession;
  readonly runtime: PaneRuntime;
  readonly onError: () => void;
}

function PaneHistoryView({ session, runtime, onError }: PaneViewProps) {
  const { navigation, lifecycle } = runtime;
  return (
    <PaneChatHistory
      onBack={() => navigation.startNewChat(currentOutlookItemKey())}
      onSignOut={session.signOut}
      session={lifecycle.getSessionSignal()}
      onSelect={navigation.openThread}
      onError={onError}
    />
  );
}

function PaneNewChatView(
  props: PaneViewProps & { readonly view: Extract<PaneView, { kind: 'new' }> },
) {
  const { view, runtime } = props;
  const { lifecycle, navigation } = runtime;
  const queryClient = useQueryClient();
  function showHistory() {
    stopChatStart(lifecycle, view.draftKey);
    navigation.showHistory();
  }
  // Opens a started chat at once; its first message is already on its way.
  function openStarted({ thread }: ChatStarted) {
    queryClient.setQueryData(
      getThreadsControllerFindOneQueryKey(thread.id),
      thread,
    );
    navigation.openPreparedThread(view.draftKey, thread.id);
  }
  const config = paneChatConfig(props, () =>
    navigation.newChat(currentOutlookItemKey()),
  );
  return (
    <PaneNewChat
      key={`${view.revision}:${view.draftKey}`}
      draftKey={view.draftKey}
      header={<NewChatHeading onHistory={showHistory} />}
      config={{
        ...config,
        events: { ...config.events, onThreadStarted: openStarted },
      }}
      lifecycle={lifecycle}
    />
  );
}

function paneChatConfig(
  { user, runtime, onError }: PaneViewProps,
  startNewChat: () => void,
): ComponentProps<typeof PaneConversation>['config'] {
  const { navigation } = runtime;
  return {
    sessionKey: user.id,
    transport: runtime.transport,
    layout: 'narrow',
    drafts: runtime.drafts,
    newChat: { start: startNewChat },
    events: {
      onNewChat: startNewChat,
      onError,
      onThreadDeleted: navigation.showHistoryAfterDelete,
    },
  };
}

function PaneThread(props: PaneViewProps & { readonly threadId: string }) {
  const { threadId, runtime } = props;
  const { lifecycle, navigation } = runtime;
  function startNewChat() {
    const itemKey = currentOutlookItemKey();
    stopChatStart(lifecycle, newChatDraftKey(itemKey));
    navigation.newChat(itemKey);
  }
  return (
    <PaneConversation
      threadId={threadId}
      config={paneChatConfig(props, startNewChat)}
      lifecycle={lifecycle}
    />
  );
}

function PaneChat(props: PaneProps) {
  const runtime = usePaneRuntime(props);
  const { view } = runtime;
  const [failedView, setFailedView] = useState<PaneView>();
  const onError = useCallback(() => setFailedView(view), [view]);
  const viewProps: PaneViewProps = { ...props, runtime, onError };

  return (
    <div className="outlook-pane flex h-full min-h-0 flex-col bg-background">
      {failedView === view && (
        <PaneRequestFailed onDismiss={() => setFailedView(undefined)} />
      )}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {view.kind === 'history' && <PaneHistoryView {...viewProps} />}
        {view.kind === 'new' && <PaneNewChatView {...viewProps} view={view} />}
        {view.kind === 'thread' && (
          <div className="min-h-0 flex-1" data-testid="outlook-conversation">
            <PaneThread {...viewProps} threadId={view.threadId} />
          </div>
        )}
      </div>
    </div>
  );
}
