import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { Database } from 'lucide-react';
import { ItemGroup } from '@ayunis/ui/components/item';
import type { WorkspaceKnowledgeBaseResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useWorkspaceContextControllerListKnowledgeBases } from '@/shared/api/generated/ayunisCoreAPI';
import {
  RemoveButton,
  WorkspaceContextEmpty,
  WorkspaceContextItem,
  WorkspaceContextPagination,
  WorkspaceContextSection,
} from './WorkspaceContextList';
import { CONTEXT_PAGE_SIZE, pageTotal } from './WorkspaceContextList.model';
import { useWorkspaceContextActions } from '@/pages/workspace/api/useWorkspaceContextActions';
import {
  CreateWorkspaceResourceDialog,
  type WorkspaceResourceFormData,
} from './CreateWorkspaceResourceDialog';

export function WorkspaceKnowledgeTab({
  workspaceId,
}: Readonly<{ workspaceId: string }>) {
  const navigate = useNavigate();
  const [knowledgePage, setKnowledgePage] = useState(1);
  const knowledgeParams = {
    limit: CONTEXT_PAGE_SIZE,
    offset: (knowledgePage - 1) * CONTEXT_PAGE_SIZE,
  };
  const { data: knowledgePageData, isLoading: isKnowledgeLoading } =
    useWorkspaceContextControllerListKnowledgeBases(
      workspaceId,
      knowledgeParams,
    );
  const { createKnowledgeBase, deleteKnowledgeBase } =
    useWorkspaceContextActions(workspaceId);

  return (
    <WorkspaceKnowledgeBaseSection
      workspaceId={workspaceId}
      items={knowledgePageData?.data ?? []}
      isLoading={isKnowledgeLoading}
      page={knowledgePage}
      total={pageTotal(knowledgePageData?.pagination)}
      onPageChange={setKnowledgePage}
      onDetach={deleteKnowledgeBase}
      onCreate={async (data) => {
        const knowledgeBase = await createKnowledgeBase({
          name: data.name,
          description: data.description,
        });
        await navigate({
          to: '/workspaces/$workspaceId/knowledge-bases/$knowledgeBaseId',
          params: { workspaceId, knowledgeBaseId: knowledgeBase.id },
        });
      }}
    />
  );
}

function WorkspaceKnowledgeBaseSection({
  workspaceId,
  items,
  isLoading,
  page,
  total,
  onPageChange,
  onDetach,
  onCreate,
}: Readonly<{
  workspaceId: string;
  items: WorkspaceKnowledgeBaseResponseDto[];
  isLoading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onDetach: (id: string) => void;
  onCreate: (data: WorkspaceResourceFormData) => Promise<unknown>;
}>) {
  const { t } = useTranslation('workspace');
  const addButton = (
    <CreateWorkspaceResourceDialog
      buttonText={t('context.knowledge.create')}
      buttonTestId="workspace-knowledge-create"
      title={t('context.knowledge.create')}
      description={t('context.knowledge.createDescription')}
      nameLabel={t('context.knowledge.name')}
      descriptionLabel={t('context.knowledge.descriptionLabel')}
      confirmText={t('context.knowledge.create')}
      onCreate={onCreate}
    />
  );

  return (
    <WorkspaceContextSection
      title={t('context.knowledge.title')}
      description={t('context.knowledge.description')}
      action={addButton}
    >
      {isLoading ? <p>{t('context.addDialog.loading')}</p> : null}
      {!isLoading && items.length === 0 ? (
        <WorkspaceContextEmpty
          icon={<Database />}
          title={t('context.knowledge.emptyTitle')}
          description={t('context.knowledge.empty')}
          action={addButton}
        />
      ) : null}
      {items.length > 0 ? (
        <ItemGroup className="gap-2">
          {items.map((knowledgeBase) => (
            <WorkspaceContextItem
              key={knowledgeBase.id}
              testId={`workspace-knowledge-base-${knowledgeBase.id}`}
              icon={<Database />}
              title={
                <Link
                  to="/workspaces/$workspaceId/knowledge-bases/$knowledgeBaseId"
                  params={{
                    workspaceId,
                    knowledgeBaseId: knowledgeBase.id,
                  }}
                  className="hover:underline"
                >
                  {knowledgeBase.name}
                </Link>
              }
              description={t('context.knowledge.documentCount', {
                count: knowledgeBase.documentCount,
              })}
              action={
                <RemoveButton
                  label={t('context.knowledge.detach')}
                  onClick={() => onDetach(knowledgeBase.id)}
                />
              }
            />
          ))}
        </ItemGroup>
      ) : null}
      <WorkspaceContextPagination
        page={page}
        total={total}
        testId="workspace-knowledge-pagination"
        onPageChange={onPageChange}
      />
    </WorkspaceContextSection>
  );
}
