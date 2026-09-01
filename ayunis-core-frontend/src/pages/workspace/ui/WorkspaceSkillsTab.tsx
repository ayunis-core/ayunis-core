import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { ItemGroup } from '@ayunis/ui/components/item';
import {
  useSkillsControllerFindAll,
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
import { CreateWorkspaceResourceDialog } from './CreateWorkspaceResourceDialog';

export function WorkspaceSkillsTab({
  workspaceId,
}: Readonly<{ workspaceId: string }>) {
  const { t } = useTranslation('workspace');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const listParams = {
    limit: CONTEXT_PAGE_SIZE,
    offset: (page - 1) * CONTEXT_PAGE_SIZE,
  };
  const { data: skillPage, isLoading } =
    useWorkspaceContextControllerListSkills(workspaceId, listParams);
  const { data: personalSkills, isLoading: areCandidatesLoading } =
    useSkillsControllerFindAll({ query: { enabled: isDialogOpen } });
  const { createSkill, copySkills, deleteSkill } =
    useWorkspaceContextActions(workspaceId);

  const addButton = (
    <div className="flex gap-2">
      <CreateWorkspaceResourceDialog
        buttonText={t('context.skills.create')}
        title={t('context.skills.create')}
        description={t('context.skills.createDescription')}
        nameLabel={t('context.skills.name')}
        descriptionLabel={t('context.skills.shortDescription')}
        instructionsLabel={t('context.skills.instructions')}
        confirmText={t('context.skills.create')}
        onCreate={(data) =>
          createSkill({
            name: data.name,
            shortDescription: data.description,
            instructions: data.instructions,
          })
        }
      />
      <Button
        variant="outline"
        size="sm"
        data-testid="workspace-skills-add"
        onClick={() => setIsDialogOpen(true)}
      >
        <Plus /> {t('context.skills.add')}
      </Button>
    </div>
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
                  label={t('context.skills.delete')}
                  onClick={() => deleteSkill(skill.id)}
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
        items={(personalSkills ?? [])
          .filter((skill) => !skill.isShared)
          .map((skill) => ({
            id: skill.id,
            name: skill.name,
            description: skill.shortDescription,
            isAttached: false,
          }))}
        currentPage={1}
        onPageChange={() => undefined}
        onConfirm={copySkills}
      />
    </WorkspaceContextSection>
  );
}
