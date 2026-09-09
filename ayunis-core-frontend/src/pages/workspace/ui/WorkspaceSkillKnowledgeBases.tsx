import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkspaceContextControllerListKnowledgeBases } from '@/shared/api/generated/ayunisCoreAPI';
import { SkillKnowledgeBasesCard } from '@/widgets/skill-knowledge-bases-card';
import { WorkspaceContextPagination } from './WorkspaceContextList';
import { CONTEXT_PAGE_SIZE, pageTotal } from './WorkspaceContextList.model';

export function WorkspaceSkillKnowledgeBases({
  workspaceId,
  assignedIds,
  isPending,
  onToggle,
}: Readonly<{
  workspaceId: string;
  assignedIds: string[];
  isPending: boolean;
  onToggle: (id: string) => void;
}>) {
  const { t } = useTranslation('skill');
  const [page, setPage] = useState(1);
  const { data, isError } = useWorkspaceContextControllerListKnowledgeBases(
    workspaceId,
    { limit: CONTEXT_PAGE_SIZE, offset: (page - 1) * CONTEXT_PAGE_SIZE },
  );
  if (isError)
    return <p role="alert">{t('knowledgeBases.errors.failedToLoad')}</p>;
  return (
    <div>
      <SkillKnowledgeBasesCard
        knowledgeBases={data?.data ?? []}
        assignedIds={assignedIds}
        isPending={isPending}
        onToggle={onToggle}
      />
      <WorkspaceContextPagination
        page={page}
        total={pageTotal(data?.pagination)}
        testId="workspace-skill-knowledge-bases"
        onPageChange={setPage}
      />
    </div>
  );
}
