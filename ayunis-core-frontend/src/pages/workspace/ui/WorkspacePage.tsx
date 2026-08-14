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
import { useWorkspaceContextControllerFindContext } from '@/shared/api/generated/ayunisCoreAPI';
import type {
  GetThreadsResponseDtoItem,
  WorkspaceContextResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { hasProcessingWorkspaceDocuments } from '@/shared/lib/workspace-context';
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
  const [instructionDraft, setInstructionDraft] = useState(() =>
    createInstructionDraft(workspace.id, context?.instruction ?? null),
  );
  const { deleteChat } = useDeleteChat();
  const { data: refreshedContext } = useWorkspaceContextControllerFindContext(
    workspace.id,
    {
      query: {
        enabled: context !== null,
        initialData: context ?? undefined,
        staleTime: 0,

        refetchInterval: (query) =>
          hasProcessingWorkspaceDocuments(query.state.data) ? 5000 : false,
      },
    },
  );
  const visibleContext = refreshedContext ?? context;
  const knowledgeCount = visibleContext
    ? visibleContext.knowledgeBases.length + visibleContext.documents.length
    : 0;
  const skillsCount = visibleContext?.skills.length ?? 0;
  const savedInstruction = visibleContext?.instruction ?? null;
  const currentInstructionDraft = resolveInstructionDraft(
    instructionDraft,
    workspace.id,
    savedInstruction,
  );
  if (currentInstructionDraft !== instructionDraft) {
    setInstructionDraft(currentInstructionDraft);
  }

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
          <div className="space-y-6" data-testid="workspace-page">
            <WorkspaceHero workspace={workspace} />

            <WorkspaceChatStarter
              workspaceId={workspace.id}
              selectedModelId={selectedModelId}
              isEmbeddingModelEnabled={isEmbeddingModelEnabled}
            />

            <Tabs defaultValue="chats">
              <TabsList>
                <TabsTrigger value="chats" data-testid="workspace-tab-chats">
                  {t('page.chatsTab')}
                  <Badge variant="secondary">{chatCount}</Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="knowledge"
                  data-testid="workspace-tab-knowledge"
                >
                  {t('page.knowledgeTab')}
                  <Badge variant="secondary">{knowledgeCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="skills" data-testid="workspace-tab-skills">
                  {t('page.skillsTab')}
                  <Badge variant="secondary">{skillsCount}</Badge>
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
                  chatCount={chatCount}
                  onDeleteChat={deleteChat}
                />
              </TabsContent>
              <TabsContent value="knowledge" className="pt-4">
                {visibleContext ? (
                  <WorkspaceKnowledgeTab
                    workspaceId={workspace.id}
                    context={visibleContext}
                  />
                ) : (
                  <WorkspaceContextLoadError />
                )}
              </TabsContent>
              <TabsContent value="skills" className="pt-4">
                {visibleContext ? (
                  <WorkspaceSkillsTab
                    workspaceId={workspace.id}
                    context={visibleContext}
                  />
                ) : (
                  <WorkspaceContextLoadError />
                )}
              </TabsContent>
              <TabsContent value="instructions" className="pt-4">
                {visibleContext ? (
                  <WorkspaceInstructionsTab
                    workspaceId={workspace.id}
                    value={currentInstructionDraft.value}
                    onChange={(value) =>
                      setInstructionDraft((current) => ({
                        ...current,
                        value,
                        isDirty: true,
                      }))
                    }
                    onSaved={(savedValue) =>
                      setInstructionDraft((current) => ({
                        ...current,
                        savedInstruction: savedValue,
                        isDirty:
                          normalizeInstructionValue(current.value) !==
                          savedValue,
                      }))
                    }
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

interface InstructionDraft {
  workspaceId: string;
  savedInstruction: string | null;
  value: string;
  isDirty: boolean;
}

function createInstructionDraft(
  workspaceId: string,
  instruction: string | null,
): InstructionDraft {
  return {
    workspaceId,
    savedInstruction: instruction,
    value: instruction ?? '',
    isDirty: false,
  };
}

function resolveInstructionDraft(
  draft: InstructionDraft,
  workspaceId: string,
  savedInstruction: string | null,
): InstructionDraft {
  if (draft.workspaceId !== workspaceId) {
    return createInstructionDraft(workspaceId, savedInstruction);
  }
  if (!draft.isDirty && draft.savedInstruction !== savedInstruction) {
    return createInstructionDraft(workspaceId, savedInstruction);
  }
  return draft;
}

function normalizeInstructionValue(value: string): string | null {
  return value.trim() || null;
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
