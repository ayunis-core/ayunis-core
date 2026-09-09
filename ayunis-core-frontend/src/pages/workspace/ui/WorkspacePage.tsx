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
import {
  WorkspaceDeleteDialog,
  WorkspaceSettingsDialog,
} from '@/widgets/workspace-settings-dialog';
import type { Workspace } from '@/features/workspaces';
import { useDeleteChat } from '@/features/useDeleteChat';
import { useArtifactsControllerFindByWorkspace } from '@/shared/api/generated/ayunisCoreAPI';
import type { GetThreadsResponseDtoItem } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useWorkspaceKnowledgeBases } from '@/pages/workspace/api/useWorkspaceKnowledgeBases';
import { useWorkspaceSkills } from '@/pages/workspace/api/useWorkspaceSkills';
import { WorkspaceArtifactsTab } from './WorkspaceArtifactsTab';
import { WorkspaceChatsTab } from './WorkspaceChatsTab';
import { WorkspaceChatStarter } from './WorkspaceChatStarter';
import { WorkspaceHeaderActions } from './WorkspaceHeaderActions';
import { WorkspaceHero } from './WorkspaceHero';
import {
  WorkspaceInstructionsTab,
  WorkspaceKnowledgeTab,
  WorkspaceSkillsTab,
} from './WorkspaceContextTabs';

type WorkspaceTab =
  'chats' | 'artifacts' | 'skills' | 'knowledge' | 'instructions';

interface WorkspacePageProps {
  workspace: Workspace;
  activeTab: WorkspaceTab;
  chats: GetThreadsResponseDtoItem[];
  chatCount: number;
  chatPagination: { total?: number; limit: number; offset: number };
  chatSearch?: string;
  chatPage: number;
  selectedModelId?: string;
  isEmbeddingModelEnabled: boolean;
}

export default function WorkspacePage({
  workspace,
  activeTab,
  chats,
  chatCount,
  chatPagination,
  chatSearch,
  chatPage,
  selectedModelId,
  isEmbeddingModelEnabled,
}: Readonly<WorkspacePageProps>) {
  const { t } = useTranslation('workspace');
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { deleteChat } = useDeleteChat();
  const countParams = { limit: 1, offset: 0 };
  const { pagination: skillsPagination } = useWorkspaceSkills(
    workspace.id,
    countParams,
  );
  const { pagination: knowledgeBasesPagination } = useWorkspaceKnowledgeBases(
    workspace.id,
    countParams,
  );
  const { data: artifactCountPage } = useArtifactsControllerFindByWorkspace(
    workspace.id,
    countParams,
  );
  const knowledgeCount = knowledgeBasesPagination?.total ?? 0;
  const skillsCount = skillsPagination?.total ?? 0;
  const artifactCount = artifactCountPage?.pagination.total ?? 0;

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
                onOpenDelete={() => setIsDeleteOpen(true)}
              />
            }
          />
        }
        contentArea={
          <div className="space-y-6" data-testid="workspace-page">
            <WorkspaceHero workspace={workspace} />

            <WorkspaceChatStarter
              workspaceId={workspace.id}
              selectedModelId={selectedModelId}
              isEmbeddingModelEnabled={isEmbeddingModelEnabled}
            />

            <Tabs
              value={activeTab}
              onValueChange={(tab) =>
                void navigate({
                  to: '/workspaces/$workspaceId',
                  params: { workspaceId: workspace.id },
                  search: {
                    tab: tab === 'chats' ? undefined : (tab as WorkspaceTab),
                  },
                })
              }
            >
              <TabsList data-testid="workspace-tabs">
                <TabsTrigger value="chats" data-testid="workspace-tab-chats">
                  {t('page.chatsTab')}
                  <Badge variant="secondary">{chatCount}</Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="artifacts"
                  data-testid="workspace-tab-artifacts"
                >
                  {t('page.artifactsTab')}
                  <Badge variant="secondary">{artifactCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="skills" data-testid="workspace-tab-skills">
                  {t('page.skillsTab')}
                  <Badge variant="secondary">{skillsCount}</Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="knowledge"
                  data-testid="workspace-tab-knowledge"
                >
                  {t('page.knowledgeTab')}
                  <Badge variant="secondary">{knowledgeCount}</Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="instructions"
                  data-testid="workspace-tab-instructions"
                >
                  {t('page.instructionsTab')}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chats" className="pt-4">
                <WorkspaceChatsTab
                  chats={chats}
                  workspaceId={workspace.id}
                  chatSearch={chatSearch}
                  chatPage={chatPage}
                  chatPagination={chatPagination}
                  onDeleteChat={deleteChat}
                />
              </TabsContent>
              <TabsContent value="artifacts" className="pt-4">
                <WorkspaceArtifactsTab workspaceId={workspace.id} />
              </TabsContent>
              <TabsContent value="skills" className="pt-4">
                <WorkspaceSkillsTab workspaceId={workspace.id} />
              </TabsContent>
              <TabsContent value="knowledge" className="pt-4">
                <WorkspaceKnowledgeTab workspaceId={workspace.id} />
              </TabsContent>
              <TabsContent value="instructions" className="pt-4">
                <WorkspaceInstructionsTab workspaceId={workspace.id} />
              </TabsContent>
            </Tabs>
          </div>
        }
      />

      <WorkspaceSettingsDialog
        workspace={workspace}
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
      <WorkspaceDeleteDialog
        workspace={workspace}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onDeleted={() => void navigate({ to: '/workspaces' })}
      />
    </AppLayout>
  );
}
