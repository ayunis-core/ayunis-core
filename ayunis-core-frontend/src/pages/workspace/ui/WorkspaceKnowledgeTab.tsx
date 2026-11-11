import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Database, Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { ItemGroup } from '@ayunis/ui/components/item';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { useWorkspaceKnowledgeBases } from '@/pages/workspace/api/useWorkspaceKnowledgeBases';
import type { KnowledgeBaseResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { KnowledgeBaseListItem } from '@/shared/ui/knowledge-base-list-item';
import {
  WorkspaceContextEmpty,
  WorkspaceContextPagination,
} from './WorkspaceContextList';
import { CONTEXT_PAGE_SIZE, pageTotal } from './WorkspaceContextList.model';
import { useWorkspaceKnowledgeBaseActions } from '@/pages/workspace/api/useWorkspaceKnowledgeBaseActions';
import { KnowledgeBaseCreateDialog } from '@/widgets/resource-create-dialog';
import { KnowledgeBaseActivationToggle } from '@/widgets/knowledge-base-activation-toggle';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';

export function WorkspaceKnowledgeTab({
  workspaceId,
  canManage,
}: Readonly<{ workspaceId: string; canManage: boolean }>) {
  const { t } = useTranslation('workspace');
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const listParams = {
    limit: CONTEXT_PAGE_SIZE,
    offset: (page - 1) * CONTEXT_PAGE_SIZE,
  };
  const { knowledgeBases, pagination, isLoading } = useWorkspaceKnowledgeBases(
    workspaceId,
    listParams,
  );
  const {
    createKnowledgeBase,
    deleteKnowledgeBase,
    setKnowledgeBaseActive,
    isChangingKnowledgeBaseState,
  } = useWorkspaceKnowledgeBaseActions(workspaceId);

  const createButton = (
    <OnboardingTourTarget name={TOUR_TARGET.workspaceKnowledge}>
      <KnowledgeBaseCreateDialog
        buttonText={t('context.knowledge.create')}
        buttonTestId="workspace-knowledge-create"
        onCreate={async (formData) => {
          const knowledgeBase = await createKnowledgeBase({
            name: formData.name,
            description: formData.description ?? '',
          });
          await navigate({
            to: '/workspaces/$workspaceId/knowledge-bases/$knowledgeBaseId',
            params: { workspaceId, knowledgeBaseId: knowledgeBase.id },
          });
        }}
      />
    </OnboardingTourTarget>
  );
  return (
    <section className="space-y-3">
      {canManage ? (
        <div className="flex justify-end">{createButton}</div>
      ) : null}
      {isLoading ? <p>{t('context.addDialog.loading')}</p> : null}
      {!isLoading && knowledgeBases.length === 0 ? (
        <WorkspaceContextEmpty
          icon={<Database />}
          title={t('context.knowledge.emptyTitle')}
          description={t('context.knowledge.empty')}
        />
      ) : null}
      {knowledgeBases.length > 0 ? (
        <ItemGroup className="gap-2">
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
                    workspaceId,
                    knowledgeBaseId: knowledgeBase.id,
                  },
                })
              }
              actions={
                canManage ? (
                  <WorkspaceKnowledgeBaseActions
                    knowledgeBase={knowledgeBase}
                    isPending={isChangingKnowledgeBaseState}
                    onToggle={(isActive) =>
                      setKnowledgeBaseActive({
                        knowledgeBaseId: knowledgeBase.id,
                        isActive,
                      })
                    }
                    onDelete={() => deleteKnowledgeBase(knowledgeBase.id)}
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {knowledgeBase.isActive
                      ? t('context.knowledge.active')
                      : t('context.knowledge.inactive')}
                  </span>
                )
              }
            />
          ))}
        </ItemGroup>
      ) : null}
      <WorkspaceContextPagination
        page={page}
        total={pageTotal(pagination)}
        testId="workspace-knowledge-pagination"
        onPageChange={setPage}
      />
    </section>
  );
}

function WorkspaceKnowledgeBaseActions({
  knowledgeBase,
  isPending,
  onToggle,
  onDelete,
}: Readonly<{
  knowledgeBase: KnowledgeBaseResponseDto;
  isPending: boolean;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
}>) {
  const { t } = useTranslation('workspace');

  return (
    <>
      <KnowledgeBaseActivationToggle
        knowledgeBaseId={knowledgeBase.id}
        isActive={knowledgeBase.isActive}
        isPending={isPending}
        testId={`workspace-knowledge-base-active-${knowledgeBase.id}`}
        tooltip={t('context.knowledge.activeTooltip')}
        onToggle={onToggle}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            aria-label={t('context.knowledge.detach')}
            data-testid={`workspace-knowledge-base-delete-${knowledgeBase.id}`}
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('context.knowledge.detach')}</TooltipContent>
      </Tooltip>
    </>
  );
}
