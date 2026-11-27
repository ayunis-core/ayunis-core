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

type PaneRuntime = ReturnType<typeof usePaneRuntime>;
type PaneCapabilities = ReturnType<typeof outlookChatCapabilities> & {
  voice: boolean;
};

function usePaneCapabilities(user: MeResponseDto) {
  const toggles = useAppControllerFeatureToggles();
  const academy = useAcademyAccessControllerGetStatus({
    query: {
      enabled: user.scopes.includes(SurfaceScope['academy:read']),
      retry: false,
    },
  });
  const capabilities: PaneCapabilities = {
    ...outlookChatCapabilities(user.scopes),
    voice:
      user.scopes.includes(SurfaceScope.voice) &&
      toggles.data?.voiceEnabled === true,
  };
  return { capabilities, isAcademyGated: academy.data?.allowed === false };
}

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
  readonly startAttempt: ReturnType<typeof useStartPaneThread>;
  readonly capabilities: PaneCapabilities;
  readonly isAcademyGated: boolean;
  readonly onError: () => void;
}

function PaneHistoryView({
  session,
  runtime,
  capabilities,
  onError,
}: PaneViewProps) {
  const { navigation, lifecycle } = runtime;
  return (
    <PaneChatHistory
      capabilities={capabilities}
      onBack={() => navigation.startNewChat(currentOutlookItemKey())}
      onSignOut={session.signOut}
      session={lifecycle.getSessionSignal()}
      onSelect={navigation.openThread}
      onError={onError}
    />
  );
}

function PaneNewChatView({
  view,
  user,
  runtime,
  startAttempt,
  capabilities,
  isAcademyGated,
  onError,
}: PaneViewProps & { readonly view: Extract<PaneView, { kind: 'new' }> }) {
  function showHistory() {
    startAttempt.stop();
    runtime.navigation.showHistory();
  }
  return (
    <PaneNewChat
      key={`${view.revision}:${view.draftKey}`}
      draftKey={view.draftKey}
      header={<NewChatHeading onHistory={showHistory} />}
      drafts={runtime.drafts}
      capabilities={capabilities}
      onError={onError}
      startAttempt={startAttempt}
      isAcademyGated={isAcademyGated}
      canReadDefaults={user.scopes.includes(SurfaceScope['chat-settings:read'])}
    />
  );
}

function PaneThread({
  threadId,
  user,
  runtime,
  startAttempt,
  capabilities,
  isAcademyGated,
  onError,
}: PaneViewProps & { readonly threadId: string }) {
  const { t } = useTranslation('outlook');
  const thread = usePaneThread(threadId);
  const { lifecycle, transport, drafts, navigation } = runtime;
  function startNewChat() {
    const itemKey = currentOutlookItemKey();
    startAttempt.stop();
    startAttempt.stop(newChatDraftKey(itemKey));
    navigation.newChat(itemKey);
  }
  if (thread.data) {
    return (
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
    );
  }
  if (thread.isError) {
    return (
      <PaneLoadError
        onRetry={() => {
          void thread.refetch();
        }}
        testId="outlook-thread-retry"
      />
    );
  }
  return (
    <p role="status" className="p-4">
      {t('pane.loading')}
    </p>
  );
}

function PaneChat(props: PaneProps) {
  const runtime = usePaneRuntime(props);
  const { view, navigation, lifecycle } = runtime;
  const [failedView, setFailedView] = useState<PaneView>();
  const onError = useCallback(() => setFailedView(view), [view]);
  const startAttempt = useStartPaneThread({
    lifecycle,
    draftKey: view.kind === 'new' ? view.draftKey : undefined,
    openThread: navigation.openPreparedThread,
    onError,
  });
  const viewProps: PaneViewProps = {
    ...props,
    ...usePaneCapabilities(props.user),
    runtime,
    startAttempt,
    onError,
  };

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
