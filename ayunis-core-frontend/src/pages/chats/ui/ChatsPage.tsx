import { useState, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { History } from '@ayunis/chat/surface';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { ListToolbar } from '@/widgets/list-toolbar';
import { CreateChatWorkspaceDialog } from '@/widgets/chat-workspace-menu';
import { threadRunLifecycle } from '@/features/thread-run';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { useChatsHistoryConfig } from '@/pages/chats/hooks/useChatsHistoryConfig';
import ChatsFilters from './ChatsFilters';

interface ChatsPageProps {
  readonly sessionKey: string;
  readonly search?: string;
  readonly page: number;
}

export default function ChatsPage({
  sessionKey,
  search,
  page,
}: ChatsPageProps) {
  const navigate = useNavigate();
  const [empty, setEmpty] = useState(false);
  const [workspaceFor, setWorkspaceFor] = useState<string>();
  const config = useChatsHistoryConfig({
    sessionKey,
    onCreateWorkspace: setWorkspaceFor,
  });
  const history = (
    <History
      config={config}
      lifecycle={threadRunLifecycle}
      search={search}
      pagination={{
        page,
        onPage: (next) =>
          void navigate({ to: '/chats', search: { search, page: next } }),
      }}
      onSelect={(threadId) =>
        void navigate({ to: '/chats/$threadId', params: { threadId } })
      }
      onEmptyChange={setEmpty}
    />
  );

  return (
    <AppLayout>
      <ChatsFrame empty={empty} search={search}>
        {history}
      </ChatsFrame>
      {workspaceFor && (
        <CreateChatWorkspaceDialog
          threadId={workspaceFor}
          open
          onOpenChange={(open) => {
            if (!open) setWorkspaceFor(undefined);
          }}
        />
      )}
    </AppLayout>
  );
}

/** Without any chats the page is a full-screen message without the search. */
function ChatsFrame({
  empty,
  search,
  children,
}: Readonly<{ empty: boolean; search?: string; children: ReactNode }>) {
  const { t } = useTranslation('chats');
  if (empty) {
    return (
      <FullScreenMessageLayout
        header={
          <ContentAreaHeader
            breadcrumbs={[{ label: t('page.title') }]}
            action={<HelpLink path="chat/" />}
          />
        }
      >
        {children}
      </FullScreenMessageLayout>
    );
  }
  return (
    <ContentAreaLayout
      contentHeader={
        <ContentAreaHeader
          breadcrumbs={[{ label: t('page.title') }]}
          action={
            <ListToolbar data-testid="chats-toolbar">
              <ChatsFilters search={search} />
              <HelpLink path="chat/" />
            </ListToolbar>
          }
        />
      }
      contentArea={children}
    />
  );
}
