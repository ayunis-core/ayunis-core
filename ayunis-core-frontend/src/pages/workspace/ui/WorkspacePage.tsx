import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ayunis/ui/components/tabs';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { WorkspaceSettingsDialog } from '@/widgets/workspace-settings-dialog';
import type { Workspace } from '@/features/workspaces';
import { useDeleteChat } from '@/features/useDeleteChat';
import type { GetThreadsResponseDtoItem } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { WorkspaceChatsTab } from './WorkspaceChatsTab';
import { WorkspaceChatStarter } from './WorkspaceChatStarter';
import { WorkspaceHeaderActions } from './WorkspaceHeaderActions';
import { WorkspaceHero } from './WorkspaceHero';

interface WorkspacePageProps {
  workspace: Workspace;
  chats: GetThreadsResponseDtoItem[];
  /** Total chats in the workspace, which can exceed the loaded page. */
  chatCount: number;
  selectedModelId?: string;
  isEmbeddingModelEnabled: boolean;
}

export default function WorkspacePage({
  workspace,
  chats,
  chatCount,
  selectedModelId,
  isEmbeddingModelEnabled,
}: Readonly<WorkspacePageProps>) {
  const { t } = useTranslation('workspace');
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { deleteChat } = useDeleteChat();

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: t('page.breadcrumb'), href: '/workspaces' },
              { label: workspace.name },
            ]}
            action={
              <WorkspaceHeaderActions
                workspace={workspace}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            }
          />
        }
        contentArea={
          <div className="space-y-6">
            <WorkspaceHero workspace={workspace} />

            <WorkspaceChatStarter
              workspaceId={workspace.id}
              selectedModelId={selectedModelId}
              isEmbeddingModelEnabled={isEmbeddingModelEnabled}
            />

            <Tabs defaultValue="chats">
              <TabsList>
                <TabsTrigger value="chats">
                  {t('page.chatsTab')}
                  <Badge variant="secondary">{chatCount}</Badge>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chats" className="pt-4">
                <WorkspaceChatsTab
                  chats={chats}
                  chatCount={chatCount}
                  onDeleteChat={deleteChat}
                />
              </TabsContent>
            </Tabs>
          </div>
        }
      />

      <WorkspaceSettingsDialog
        workspace={workspace}
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onDeleted={() => void navigate({ to: '/workspaces' })}
      />
    </AppLayout>
  );
}
