import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInvalidateWorkspaceResources } from '@/pages/workspace/api/useInvalidateWorkspaceResources';
import { showError } from '@/shared/lib/toast';
import { WorkspaceSkillKnowledgeBases } from './WorkspaceSkillKnowledgeBases';
import { useTranslation } from 'react-i18next';
import { Pin, Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Switch } from '@ayunis/ui/components/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { SkillPropertiesCard } from '@/widgets/resource-properties-card';
import { KnowledgeBaseCard } from '@/widgets/knowledge-base-card';
import { useWorkspaceSkillSources } from '@/pages/workspace/api/useWorkspaceSkillSources';
import { useWorkspaceContextActions } from '@/pages/workspace/api/useWorkspaceContextActions';
import type {
  WorkspaceResponseDto,
  WorkspaceSkillResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  workspaceContextControllerAssignSkillKnowledgeBase,
  workspaceContextControllerUnassignSkillKnowledgeBase,
  workspaceContextControllerUpdateSkill,
} from '@/shared/api/generated/ayunisCoreAPI';

export function WorkspaceSkillDetailPage({
  workspace,
  skill,
  isEmbeddingModelEnabled,
}: Readonly<{
  workspace: WorkspaceResponseDto;
  skill: WorkspaceSkillResponseDto;
  isEmbeddingModelEnabled: boolean;
}>) {
  const { t } = useTranslation('workspace');
  const { t: tSkills } = useTranslation('skills');
  const { t: tSkill } = useTranslation('skill');
  const invalidateResources = useInvalidateWorkspaceResources(workspace.id);
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const [isAssigning, setIsAssigning] = useState(false);
  const { deleteSkill, setSkillActive, setSkillPinned, isChangingSkillState } =
    useWorkspaceContextActions(workspace.id);
  const sourcesHook = useWorkspaceSkillSources({
    workspaceId: workspace.id,
    skillId: skill.id,
  });

  const toggleKnowledgeBase = async (knowledgeBaseId: string) => {
    setIsAssigning(true);
    try {
      if (skill.knowledgeBaseIds.includes(knowledgeBaseId)) {
        await workspaceContextControllerUnassignSkillKnowledgeBase(
          workspace.id,
          skill.id,
          knowledgeBaseId,
        );
      } else {
        await workspaceContextControllerAssignSkillKnowledgeBase(
          workspace.id,
          skill.id,
          knowledgeBaseId,
        );
      }
      await invalidateResources();
    } catch {
      showError(
        tSkill(
          skill.knowledgeBaseIds.includes(knowledgeBaseId)
            ? 'knowledgeBases.errors.failedToUnassign'
            : 'knowledgeBases.errors.failedToAssign',
        ),
      );
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: t('page.breadcrumb'), href: '/workspaces' },
              { label: workspace.name, href: `/workspaces/${workspace.id}` },
              {
                label: t('page.skillsTab'),
                href: `/workspaces/${workspace.id}`,
                search: { tab: 'skills' },
              },
              { label: skill.name },
            ]}
            action={
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {skill.isActive
                      ? tSkills('card.activeLabel')
                      : tSkills('card.inactiveLabel')}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Switch
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
                        <Pin className={skill.isPinned ? 'fill-current' : ''} />
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
                      aria-label={tSkills('card.deleteLabel')}
                      onClick={() =>
                        confirm({
                          title: tSkill('delete.confirmTitle'),
                          description: tSkill('delete.confirmDescription', {
                            name: skill.name,
                          }),
                          confirmText: tSkill('delete.confirmText'),
                          cancelText: tSkill('delete.cancelText'),
                          variant: 'destructive',
                          onConfirm: () => {
                            deleteSkill(skill.id, {
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
                  <TooltipContent>{tSkills('card.deleteLabel')}</TooltipContent>
                </Tooltip>
              </>
            }
          />
        }
        contentArea={
          <div className="grid gap-4">
            <SkillPropertiesCard
              key={skill.id}
              skill={skill}
              onUpdate={async (data) => {
                await workspaceContextControllerUpdateSkill(
                  workspace.id,
                  skill.id,
                  data,
                );
                await invalidateResources();
              }}
            />
            <WorkspaceSkillKnowledgeBases
              key={skill.id}
              workspaceId={workspace.id}
              assignedIds={skill.knowledgeBaseIds}
              isPending={isAssigning}
              onToggle={(knowledgeBaseId) =>
                void toggleKnowledgeBase(knowledgeBaseId)
              }
            />
            <KnowledgeBaseCard
              entity={skill}
              isEnabled={isEmbeddingModelEnabled}
              translationNamespace="skill"
              sourcesHook={sourcesHook}
            />
          </div>
        }
      />
    </AppLayout>
  );
}
