import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { ItemGroup } from '@ayunis/ui/components/item';
import {
  useWorkspaceContextControllerListSkillCandidates,
  useWorkspaceContextControllerListSkills,
} from '@/shared/api/generated/ayunisCoreAPI';
import { AddWorkspaceItemsDialog } from './AddWorkspaceItemsDialog';
import {
  RemoveButton,
  WorkspaceContextEmpty,
  WorkspaceContextItem,
  WorkspaceContextPagination,
  WorkspaceContextSection,
} from './WorkspaceContextList';
import { CONTEXT_PAGE_SIZE, pageTotal } from './WorkspaceContextList.model';
import { useWorkspaceContextActions } from '@/pages/workspace/api/useWorkspaceContextActions';

export function WorkspaceSkillsTab({
  workspaceId,
}: Readonly<{ workspaceId: string }>) {
  const { t } = useTranslation('workspace');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [candidatePage, setCandidatePage] = useState(1);
  const listParams = {
    limit: CONTEXT_PAGE_SIZE,
    offset: (page - 1) * CONTEXT_PAGE_SIZE,
  };
  const candidateParams = {
    limit: CONTEXT_PAGE_SIZE,
    offset: (candidatePage - 1) * CONTEXT_PAGE_SIZE,
  };
  const { data: skillPage, isLoading } =
    useWorkspaceContextControllerListSkills(workspaceId, listParams);
  const { data: skillCandidates, isLoading: areCandidatesLoading } =
    useWorkspaceContextControllerListSkillCandidates(
      workspaceId,
      candidateParams,
      {
        query: { enabled: isDialogOpen },
      },
    );
  const { attachSkills, detachSkill } = useWorkspaceContextActions(workspaceId);

  const addButton = (
    <Button
      variant="outline"
      size="sm"
      data-testid="workspace-skills-add"
      onClick={() => setIsDialogOpen(true)}
    >
      <Plus /> {t('context.skills.add')}
    </Button>
  );
  const skills = skillPage?.data ?? [];

  return (
    <WorkspaceContextSection
      title={t('context.skills.title')}
      description={t('context.skills.description')}
      action={addButton}
    >
      {isLoading ? <p>{t('context.addDialog.loading')}</p> : null}
      {!isLoading && skills.length === 0 ? (
        <WorkspaceContextEmpty
          icon={<Sparkles />}
          title={t('context.skills.emptyTitle')}
          description={t('context.skills.empty')}
          action={addButton}
        />
      ) : null}
      {skills.length > 0 ? (
        <ItemGroup className="gap-2">
          {skills.map((skill) => (
            <WorkspaceContextItem
              key={skill.id}
              testId={`workspace-skill-${skill.id}`}
              icon={<Sparkles />}
              title={skill.name}
              description={skill.shortDescription}
              action={
                <RemoveButton
                  label={t('context.skills.detach')}
                  onClick={() => detachSkill(skill.id)}
                />
              }
            />
          ))}
        </ItemGroup>
      ) : null}
      <WorkspaceContextPagination
        page={page}
        total={pageTotal(skillPage?.pagination)}
        testId="workspace-skills-pagination"
        onPageChange={setPage}
      />
      <AddWorkspaceItemsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={t('context.skills.add')}
        description={t('context.skills.addDescription')}
        isLoading={areCandidatesLoading}
        items={(skillCandidates?.data ?? []).map((skill) => ({
          id: skill.id,
          name: skill.name,
          description: skill.shortDescription,
          isAttached: skill.isAttached,
        }))}
        currentPage={candidatePage}
        pagination={skillCandidates?.pagination}
        onPageChange={setCandidatePage}
        onConfirm={attachSkills}
      />
    </WorkspaceContextSection>
  );
}
