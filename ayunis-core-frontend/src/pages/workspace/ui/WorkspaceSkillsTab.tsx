import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { PenLine, Sparkles } from 'lucide-react';
import type { Workspace } from '@/features/workspaces';
import { useWorkspaceSkills } from '@/pages/workspace/api/useWorkspaceSkills';
import { useWorkspaceContextActions } from '@/pages/workspace/api/useWorkspaceContextActions';
import { EmptyHint } from '@/shared/ui/empty-hint/EmptyHint';
import { ListSection } from '@/shared/ui/list-section/ListSection';
import { SkillListItem } from '@/shared/ui/skill-list-item';
import { SkillCreateDialog } from '@/widgets/resource-create-dialog';
import { WorkspaceContextPagination } from './WorkspaceContextList';
import { CONTEXT_PAGE_SIZE, pageTotal } from './WorkspaceContextList.model';
import { WorkspaceAddControls } from './WorkspaceAddControls';
import { WorkspaceLinkedSection } from './WorkspaceLinkedSection';
import { WorkspaceSkillRowActions } from './WorkspaceSkillRowActions';
import { SectionLoading } from './SectionLoading';

type WorkspaceRef = Pick<Workspace, 'id' | 'name'>;

function SkillAddMenu({ workspace }: Readonly<{ workspace: WorkspaceRef }>) {
  const { t } = useTranslation('workspace');
  const navigate = useNavigate();
  const { createSkill } = useWorkspaceContextActions(workspace.id);

  return (
    <WorkspaceAddControls
      kind="skill"
      workspace={workspace}
      createIcon={<PenLine />}
      renderCreateDialog={(dialog) => (
        <SkillCreateDialog
          {...dialog}
          description={t('links.skills.createDescription', {
            workspace: workspace.name,
          })}
          onCreate={async (data) => {
            const skill = await createSkill(data);
            await navigate({
              to: '/workspaces/$workspaceId/skills/$skillId',
              params: { workspaceId: workspace.id, skillId: skill.id },
            });
          }}
        />
      )}
    />
  );
}

function CreatedSkills({ workspace }: Readonly<{ workspace: WorkspaceRef }>) {
  const { t } = useTranslation('workspace');
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { skills, pagination, isLoading } = useWorkspaceSkills(workspace.id, {
    limit: CONTEXT_PAGE_SIZE,
    offset: (page - 1) * CONTEXT_PAGE_SIZE,
  });
  const { deleteSkill, setSkillActive, setSkillPinned, isChangingSkillState } =
    useWorkspaceContextActions(workspace.id);

  return (
    <div className="space-y-2">
      <ListSection
        title={t('links.sections.created')}
        count={isLoading ? undefined : pageTotal(pagination)}
        action={<SkillAddMenu workspace={workspace} />}
        testId="workspace-created-skill"
      >
        {isLoading && (
          <SectionLoading testId="workspace-created-skill-loading" />
        )}
        {!isLoading && skills.length === 0 && (
          <EmptyHint
            icon={<Sparkles />}
            title={t('links.skills.emptyOwnTitle')}
            description={t('links.skills.emptyOwn')}
          />
        )}
        {skills.map((skill) => (
          <SkillListItem
            key={skill.id}
            testId={`workspace-skill-${skill.id}`}
            title={skill.name}
            description={skill.shortDescription}
            onClick={() =>
              void navigate({
                to: '/workspaces/$workspaceId/skills/$skillId',
                params: { workspaceId: workspace.id, skillId: skill.id },
              })
            }
            actions={
              <WorkspaceSkillRowActions
                skill={skill}
                isChangingState={isChangingSkillState}
                onSetActive={(isActive) =>
                  setSkillActive({ skillId: skill.id, isActive })
                }
                onSetPinned={(isPinned) =>
                  setSkillPinned({ skillId: skill.id, isPinned })
                }
                onDelete={() => deleteSkill(skill.id)}
              />
            }
          />
        ))}
      </ListSection>
      <WorkspaceContextPagination
        page={page}
        total={pageTotal(pagination)}
        testId="workspace-skills-pagination"
        onPageChange={setPage}
      />
    </div>
  );
}

export function WorkspaceSkillsTab({
  workspace,
}: Readonly<{ workspace: WorkspaceRef }>) {
  return (
    <div className="space-y-6">
      <CreatedSkills workspace={workspace} />
      <WorkspaceLinkedSection kind="skill" workspace={workspace} />
    </div>
  );
}
