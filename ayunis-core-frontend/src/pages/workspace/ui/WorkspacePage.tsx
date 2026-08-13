import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';
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
import type {
  GetThreadsResponseDtoItem,
  WorkspaceContextResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { WorkspaceChatsTab } from './WorkspaceChatsTab';
import { WorkspaceChatStarter } from './WorkspaceChatStarter';
import { WorkspaceHeaderActions } from './WorkspaceHeaderActions';
import { WorkspaceHero } from './WorkspaceHero';
import {
  WorkspaceInstructionsTab,
  WorkspaceKnowledgeTab,
  WorkspaceSkillsTab,
} from './WorkspaceContextTabs';

interface WorkspacePageProps {
  workspace: Workspace;
  chats: GetThreadsResponseDtoItem[];
  /** Total chats in the workspace, which can exceed the loaded page. */
  chatCount: number;
  selectedModelId?: string;
  isEmbeddingModelEnabled: boolean;
  context: WorkspaceContextResponseDto | null;
}

export default function WorkspacePage({
  workspace,
  chats,
  chatCount,
  selectedModelId,
  isEmbeddingModelEnabled,
  context,
}: Readonly<WorkspacePageProps>) {
  const { t } = useTranslation('workspace');
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { deleteChat } = useDeleteChat();
  const knowledgeCount = context
    ? context.knowledgeBases.length + context.documents.length
    : 0;
  const skillsCount = context?.skills.length ?? 0;

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
                <TabsTrigger value="knowledge">
                  {t('page.knowledgeTab')}
                  <Badge variant="secondary">{knowledgeCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="skills">
                  {t('page.skillsTab')}
                  <Badge variant="secondary">{skillsCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="instructions">
                  {t('page.instructionsTab')}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chats" className="pt-4">
                <WorkspaceChatsTab
                  chats={chats}
                  chatCount={chatCount}
                  onDeleteChat={deleteChat}
                />
              </TabsContent>
              <TabsContent value="knowledge" className="pt-4">
                {context ? (
                  <WorkspaceKnowledgeTab
                    workspaceId={workspace.id}
                    context={context}
                  />
                ) : (
                  <WorkspaceContextLoadError />
                )}
              </TabsContent>
              <TabsContent value="skills" className="pt-4">
                {context ? (
                  <WorkspaceSkillsTab
                    workspaceId={workspace.id}
                    context={context}
                  />
                ) : (
                  <WorkspaceContextLoadError />
                )}
              </TabsContent>
              <TabsContent value="instructions" className="pt-4">
                {context ? (
                  <WorkspaceInstructionsTab
                    workspaceId={workspace.id}
                    instruction={context.instruction}
                  />
                ) : (
                  <WorkspaceContextLoadError />
                )}
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

function WorkspaceContextLoadError() {
  const { t } = useTranslation('workspace');

  return (
    <Alert variant="warning">
      <AlertTitle>{t('context.loadError.title')}</AlertTitle>
      <AlertDescription>{t('context.loadError.description')}</AlertDescription>
    </Alert>
  );
}
