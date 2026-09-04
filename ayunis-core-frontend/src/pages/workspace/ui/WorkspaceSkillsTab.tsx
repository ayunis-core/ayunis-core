import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { ItemGroup } from '@ayunis/ui/components/item';
import { useWorkspaceContextControllerListSkills } from '@/shared/api/generated/ayunisCoreAPI';
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
  const [page, setPage] = useState(1);
  const listParams = {
    limit: CONTEXT_PAGE_SIZE,
    offset: (page - 1) * CONTEXT_PAGE_SIZE,
  };
  const { data: skillPage, isLoading } =
    useWorkspaceContextControllerListSkills(workspaceId, listParams);
  const { createSkill, deleteSkill } = useWorkspaceContextActions(workspaceId);

  const addButton = (
    <CreateWorkspaceResourceDialog
      buttonText={t('context.skills.create')}
      buttonTestId="workspace-skill-create"
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
    </WorkspaceContextSection>
  );
}
