import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkspaceKnowledgeBases } from '@/pages/workspace/api/useWorkspaceKnowledgeBases';
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
  const { knowledgeBases, pagination, isError } = useWorkspaceKnowledgeBases(
    workspaceId,
    { limit: CONTEXT_PAGE_SIZE, offset: (page - 1) * CONTEXT_PAGE_SIZE },
  );
  if (isError)
    return <p role="alert">{t('knowledgeBases.errors.failedToLoad')}</p>;
  return (
    <div>
      <SkillKnowledgeBasesCard
        knowledgeBases={knowledgeBases}
        assignedIds={assignedIds}
        isPending={isPending}
        onToggle={onToggle}
      />
      <WorkspaceContextPagination
        page={page}
        total={pageTotal(pagination)}
        testId="workspace-skill-knowledge-bases"
        onPageChange={setPage}
      />
    </div>
  );
}
