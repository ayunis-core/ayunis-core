import { useNavigate } from '@tanstack/react-router';
import { useWorkspaceKnowledgeBaseActions } from '@/pages/workspace/api/useWorkspaceKnowledgeBaseActions';
import { useWorkspaceKnowledgeBaseDocuments } from '@/pages/workspace/api/useWorkspaceKnowledgeBaseDocuments';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { KnowledgeBaseActivationToggle } from '@/widgets/knowledge-base-activation-toggle';
import { KnowledgeBasePropertiesCard } from '@/widgets/resource-properties-card';
import { KnowledgeBaseDocumentsCard } from '@/widgets/knowledge-base-documents-card';
import type {
  KnowledgeBaseDocumentListResponseDto,
  KnowledgeBaseResponseDto,
  WorkspaceResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function WorkspaceKnowledgeBaseDetailPage({
  workspace,
  knowledgeBase,
  documents,
}: Readonly<{
  workspace: WorkspaceResponseDto;
  knowledgeBase: KnowledgeBaseResponseDto;
  documents: KnowledgeBaseDocumentListResponseDto;
}>) {
  const { t } = useTranslation('workspace');
  const { t: tKnowledge } = useTranslation('knowledge-bases');
  const documentsController = useWorkspaceKnowledgeBaseDocuments(
    workspace.id,
    knowledgeBase.id,
    documents,
  );
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const {
    deleteKnowledgeBase,
    setKnowledgeBaseActive,
    isChangingKnowledgeBaseState,
    updateKnowledgeBase,
  } = useWorkspaceKnowledgeBaseActions(workspace.id);

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: t('page.breadcrumb'), href: '/workspaces' },
              { label: workspace.name, href: `/workspaces/${workspace.id}` },
              {
                label: t('page.knowledgeTab'),
                href: `/workspaces/${workspace.id}`,
                search: { tab: 'knowledge' },
              },
              { label: knowledgeBase.name },
            ]}
            action={
              <>
                <KnowledgeBaseActivationToggle
                  knowledgeBaseId={knowledgeBase.id}
                  isActive={knowledgeBase.isActive}
                  testId="workspace-knowledge-base-detail-active-toggle"
                  isPending={isChangingKnowledgeBaseState}
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
                      aria-label={tKnowledge('detail.deleteLabel')}
                      onClick={() =>
                        confirm({
                          title: tKnowledge('detail.confirmDelete.title'),
                          description: tKnowledge(
                            'detail.confirmDelete.description',
                            { title: knowledgeBase.name },
                          ),
                          confirmText: tKnowledge(
                            'detail.confirmDelete.confirmText',
                          ),
                          cancelText: tKnowledge(
                            'detail.confirmDelete.cancelText',
                          ),
                          variant: 'destructive',
                          onConfirm: () => {
                            deleteKnowledgeBase(knowledgeBase.id, {
                              onSuccess: () => {
                                void navigate({
                                  to: '/workspaces/$workspaceId',
                                  params: { workspaceId: workspace.id },
                                });
                              },
                            });
                          },
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {tKnowledge('detail.deleteLabel')}
                  </TooltipContent>
                </Tooltip>
              </>
            }
          />
        }
        contentArea={
          <div className="grid gap-4">
            <KnowledgeBasePropertiesCard
              key={knowledgeBase.id}
              knowledgeBase={{
                name: knowledgeBase.name,
                description: knowledgeBase.description,
              }}
              onUpdate={(data) => updateKnowledgeBase(knowledgeBase.id, data)}
            />
            <KnowledgeBaseDocumentsCard controller={documentsController} />
          </div>
        }
      />
    </AppLayout>
  );
}
