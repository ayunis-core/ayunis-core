import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Pin, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { ItemGroup } from '@ayunis/ui/components/item';
import { Switch } from '@ayunis/ui/components/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { useWorkspaceContextControllerListSkills } from '@/shared/api/generated/ayunisCoreAPI';
import { SkillListItem } from '@/shared/ui/skill-list-item';
import {
  WorkspaceContextEmpty,
  WorkspaceContextPagination,
} from './WorkspaceContextList';
import { CONTEXT_PAGE_SIZE, pageTotal } from './WorkspaceContextList.model';
import { useWorkspaceContextActions } from '@/pages/workspace/api/useWorkspaceContextActions';
import { SkillCreateDialog } from '@/widgets/resource-create-dialog';

export function WorkspaceSkillsTab({
  workspaceId,
}: Readonly<{ workspaceId: string }>) {
  const { t } = useTranslation('workspace');
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const listParams = {
    limit: CONTEXT_PAGE_SIZE,
    offset: (page - 1) * CONTEXT_PAGE_SIZE,
  };
  const { data: skillPage, isLoading } =
    useWorkspaceContextControllerListSkills(workspaceId, listParams);
  const {
    createSkill,
    deleteSkill,
    setSkillActive,
    setSkillPinned,
    isChangingSkillState,
  } = useWorkspaceContextActions(workspaceId);

  const addButton = (
    <SkillCreateDialog
      buttonText={t('context.skills.create')}
      buttonTestId="workspace-skill-create"
      onCreate={async (data) => {
        const skill = await createSkill(data);
        await navigate({
          to: '/workspaces/$workspaceId/skills/$skillId',
          params: { workspaceId, skillId: skill.id },
        });
      }}
    />
  );
  const skills = skillPage?.data ?? [];

  return (
    <section className="space-y-3">
      <div className="flex justify-end">{addButton}</div>
      {isLoading ? <p>{t('context.addDialog.loading')}</p> : null}
      {!isLoading && skills.length === 0 ? (
        <WorkspaceContextEmpty
          icon={<Sparkles />}
          title={t('context.skills.emptyTitle')}
          description={t('context.skills.empty')}
        />
      ) : null}
      {skills.length > 0 ? (
        <ItemGroup className="gap-2">
          {skills.map((skill) => (
            <SkillListItem
              key={skill.id}
              testId={`workspace-skill-${skill.id}`}
              title={skill.name}
              description={skill.shortDescription}
              onClick={() =>
                void navigate({
                  to: '/workspaces/$workspaceId/skills/$skillId',
                  params: { workspaceId, skillId: skill.id },
                })
              }
              actions={
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {skill.isActive
                        ? t('context.skills.active')
                        : t('context.skills.inactive')}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <Switch
                            data-testid={`workspace-skill-active-${skill.id}`}
                            checked={skill.isActive}
                            disabled={isChangingSkillState}
                            onCheckedChange={(isActive) =>
                              setSkillActive({ skillId: skill.id, isActive })
                            }
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        {t('context.skills.activeTooltip')}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {skill.isActive ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`workspace-skill-pin-${skill.id}`}
                          disabled={isChangingSkillState}
                          aria-label={
                            skill.isPinned
                              ? t('context.skills.unpin')
                              : t('context.skills.pin')
                          }
                          onClick={() =>
                            setSkillPinned({
                              skillId: skill.id,
                              isPinned: !skill.isPinned,
                            })
                          }
                        >
                          <Pin
                            className={skill.isPinned ? 'fill-current' : ''}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {skill.isPinned
                          ? t('context.skills.unpin')
                          : t('context.skills.pin')}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        aria-label={t('context.skills.delete')}
                        onClick={() => deleteSkill(skill.id)}
                      >
                        <Trash2 />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t('context.skills.delete')}
                    </TooltipContent>
                  </Tooltip>
                </>
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
    </section>
  );
}
