import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Database, Plus, Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import type { Workspace } from '@/features/workspaces';
import { useWorkspaceKnowledgeBases } from '@/pages/workspace/api/useWorkspaceKnowledgeBases';
import { useWorkspaceKnowledgeBaseActions } from '@/pages/workspace/api/useWorkspaceKnowledgeBaseActions';
import { EmptyHint } from '@/shared/ui/empty-hint/EmptyHint';
import { KnowledgeBaseListItem } from '@/shared/ui/knowledge-base-list-item';
import { ListSection } from '@/shared/ui/list-section/ListSection';
import { KnowledgeBaseCreateDialog } from '@/widgets/resource-create-dialog';
import { KnowledgeBaseActivationToggle } from '@/widgets/knowledge-base-activation-toggle';
import { WorkspaceContextPagination } from './WorkspaceContextList';
import { CONTEXT_PAGE_SIZE, pageTotal } from './WorkspaceContextList.model';
import { WorkspaceAddControls } from './WorkspaceAddControls';
import { WorkspaceLinkedSection } from './WorkspaceLinkedSection';
import { SectionLoading } from './SectionLoading';

type WorkspaceRef = Pick<Workspace, 'id' | 'name'>;

function KnowledgeAddMenu({
  workspace,
}: Readonly<{ workspace: WorkspaceRef }>) {
  const { t } = useTranslation('workspace');
  const navigate = useNavigate();
  const { createKnowledgeBase } = useWorkspaceKnowledgeBaseActions(
    workspace.id,
  );

  return (
    <WorkspaceAddControls
      kind="knowledgeBase"
      workspace={workspace}
      createIcon={<Plus />}
      renderCreateDialog={(dialog) => (
        <KnowledgeBaseCreateDialog
          {...dialog}
          description={t('links.knowledge.createDescription', {
            workspace: workspace.name,
          })}
          onCreate={async (formData) => {
            const knowledgeBase = await createKnowledgeBase({
              name: formData.name,
              description: formData.description ?? '',
            });
            await navigate({
              to: '/workspaces/$workspaceId/knowledge-bases/$knowledgeBaseId',
              params: {
                workspaceId: workspace.id,
                knowledgeBaseId: knowledgeBase.id,
              },
            });
          }}
        />
      )}
    />
  );
}

function CreatedKnowledgeBases({
  workspace,
  canEdit,
}: Readonly<{ workspace: WorkspaceRef; canEdit: boolean }>) {
  const { t } = useTranslation('workspace');
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { knowledgeBases, pagination, isLoading } = useWorkspaceKnowledgeBases(
    workspace.id,
    { limit: CONTEXT_PAGE_SIZE, offset: (page - 1) * CONTEXT_PAGE_SIZE },
  );
  const {
    deleteKnowledgeBase,
    setKnowledgeBaseActive,
    isChangingKnowledgeBaseState,
  } = useWorkspaceKnowledgeBaseActions(workspace.id);

  return (
    <div className="space-y-2">
      <ListSection
        title={t('links.sections.created')}
        count={isLoading ? undefined : pageTotal(pagination)}
        action={
          canEdit ? <KnowledgeAddMenu workspace={workspace} /> : undefined
        }
        testId="workspace-created-knowledgeBase"
      >
        {isLoading && (
          <SectionLoading testId="workspace-created-knowledgeBase-loading" />
        )}
        {!isLoading && knowledgeBases.length === 0 && (
          <EmptyHint
            icon={<Database />}
            title={t('links.knowledge.emptyOwnTitle')}
            description={t('links.knowledge.emptyOwn')}
          />
        )}
        {knowledgeBases.map((knowledgeBase) => (
          <KnowledgeBaseListItem
            key={knowledgeBase.id}
            testId={`workspace-knowledge-base-${knowledgeBase.id}`}
            title={knowledgeBase.name}
            description={knowledgeBase.description}
            onClick={() =>
              void navigate({
                to: '/workspaces/$workspaceId/knowledge-bases/$knowledgeBaseId',
                params: {
                  workspaceId: workspace.id,
                  knowledgeBaseId: knowledgeBase.id,
                },
              })
            }
            actions={
              canEdit && (
                <>
                  <KnowledgeBaseActivationToggle
                    knowledgeBaseId={knowledgeBase.id}
                    isActive={knowledgeBase.isActive}
                    isPending={isChangingKnowledgeBaseState}
                    testId={`workspace-knowledge-base-active-${knowledgeBase.id}`}
                    tooltip={t('context.knowledge.activeTooltip')}
                    onToggle={(isActive) =>
                      setKnowledgeBaseActive({
                        knowledgeBaseId: knowledgeBase.id,
                        isActive,
                      })
                    }
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        aria-label={t('context.knowledge.detach')}
                        onClick={() => deleteKnowledgeBase(knowledgeBase.id)}
                      >
                        <Trash2 />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t('context.knowledge.detach')}
                    </TooltipContent>
                  </Tooltip>
                </>
              )
            }
          />
        ))}
      </ListSection>
      <WorkspaceContextPagination
        page={page}
        total={pageTotal(pagination)}
        testId="workspace-knowledge-pagination"
        onPageChange={setPage}
      />
    </div>
  );
}

export function WorkspaceKnowledgeTab({
  workspace,
  canEdit,
}: Readonly<{ workspace: WorkspaceRef; canEdit: boolean }>) {
  return (
    <div className="space-y-6">
      <CreatedKnowledgeBases workspace={workspace} canEdit={canEdit} />
      <WorkspaceLinkedSection
        kind="knowledgeBase"
        workspace={workspace}
        canEdit={canEdit}
      />
    </div>
  );
}
