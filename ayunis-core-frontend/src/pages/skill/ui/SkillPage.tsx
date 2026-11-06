import AppLayout from '@/layouts/app-layout';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type {
  ShareResponseDto,
  MyTeamResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import { SkillPropertiesCard } from '@/widgets/resource-properties-card';
import SkillKnowledgeBasesCard from './SkillKnowledgeBasesCard';
import { KnowledgeBaseCard } from '@/widgets/knowledge-base-card';
import SkillMcpIntegrationsCard from './SkillMcpIntegrationsCard';
import { ConfigurationTabs } from '@/widgets/shares-tab';
import { useMyPermissions } from '@/features/permissions';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Switch } from '@ayunis/ui/components/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { Trash2, Pin } from 'lucide-react';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useNavigate, useParams, useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDeleteSkill, useSkillSources } from '@/pages/skill/api';
import { useQueryClient } from '@tanstack/react-query';
import {
  skillsControllerUpdate,
  getSkillsControllerFindAllQueryKey,
  getSkillsControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import {
  useSetSkillActivation,
  useSetSkillPin,
} from '@/features/skill-actions';
import { personalSkillListParams } from '@/shared/api/skill-scopes';
import {
  OwnerBadge,
  useResourceOwnership,
} from '@/features/resource-ownership';
import { ResourceOwnerCard } from '@/widgets/resource-owner-card';
import { useChangeSkillOwner } from '@/pages/skill/api';

export function SkillPage({
  skill,
  shares,
  userTeams,
  isEmbeddingModelEnabled,
  initialTab = 'config',
}: Readonly<{
  skill: SkillResponseDto;
  shares: ShareResponseDto[];
  userTeams: MyTeamResponseDto[];
  isEmbeddingModelEnabled: boolean;
  initialTab?: 'config' | 'share';
}>) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation('skill');
  const { id } = useParams({
    from: '/_authenticated/skills/$id',
  });
  const { t: tSkills } = useTranslation('skills');
  const { t: tOwnership } = useTranslation('ownership');
  const deleteSkill = useDeleteSkill();
  const setActivation = useSetSkillActivation();
  const setPin = useSetSkillPin();
  const { confirm } = useConfirmation();

  const sourcesHook = useSkillSources({
    skill,
  });

  const handleTabChange = useCallback(
    (value: string) => {
      void navigate({
        to: '/skills/$id',
        params: { id },
        search: value === 'config' ? {} : { tab: value as 'share' },
      });
    },
    [navigate, id],
  );

  function handleDelete() {
    confirm({
      title: t('delete.confirmTitle'),
      description: t('delete.confirmDescription', { name: skill.name }),
      confirmText: t('delete.confirmText'),
      cancelText: t('delete.cancelText'),
      variant: 'destructive',
      onConfirm: () => {
        deleteSkill.mutate({ id: skill.id });
      },
    });
  }

  const { can } = useMyPermissions();
  const canManageSkills = can('manage_skills');
  const { canManage } = useResourceOwnership('skill');
  const ownerChange = useChangeSkillOwner(skill.id);
  const isCollective = skill.ownerType === 'team' || skill.ownerType === 'org';
  const isManageable = canManage(skill);
  const isReadOnly = skill.isShared || (isCollective && !isManageable);
  // Team and organization state is global, so only managers may switch it.
  const canSetState = !isCollective || isManageable;
  // Team and organization skills cannot be shared.
  const canShare = skill.ownerType === 'personal';

  const isEditable = !isReadOnly && canManageSkills;
  const configContent = (
    <div className="grid gap-4">
      {isManageable && (
        <ResourceOwnerCard
          kind="skill"
          resource={skill}
          onPreview={ownerChange.previewOwnerChange}
          onChange={ownerChange.changeOwner}
        />
      )}
      <SkillPropertiesCard
        key={skill.id}
        skill={skill}
        disabled={!isEditable}
        onUpdate={async (data) => {
          await skillsControllerUpdate(skill.id, data);
          await Promise.all(
            [
              getSkillsControllerFindAllQueryKey(personalSkillListParams),
              getSkillsControllerFindOneQueryKey(skill.id),
            ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
          );
          await router.invalidate();
        }}
      />
      {isEmbeddingModelEnabled && (
        <SkillKnowledgeBasesCard skill={skill} disabled={!isEditable} />
      )}
      <SkillMcpIntegrationsCard disabled={!isEditable} />
      <KnowledgeBaseCard
        entity={skill}
        isEnabled={isEmbeddingModelEnabled}
        disabled={!isEditable}
        translationNamespace="skill"
        sourcesHook={sourcesHook}
      />
    </div>
  );

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: t('breadcrumb.skills'), href: '/skills' },
              { label: skill.name },
            ]}
            badge={
              skill.isShared ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{t('shared.badge')}</Badge>
                  {skill.creatorName && (
                    <span className="text-sm text-muted-foreground">
                      {t('shared.by', { name: skill.creatorName })}
                    </span>
                  )}
                </div>
              ) : (
                <OwnerBadge
                  resource={skill}
                  testId="skill-detail-owner-badge"
                />
              )
            }
            action={
              <>
                <HelpLink path="skills/" />
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
                          onCheckedChange={() =>
                            setActivation.mutate({
                              id: skill.id,
                              isActive: !skill.isActive,
                            })
                          }
                          disabled={setActivation.isPending || !canSetState}
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {isCollective
                        ? tOwnership('activation.managedByOwner')
                        : tSkills('card.activeTooltip')}
                    </TooltipContent>
                  </Tooltip>
                </div>
                {skill.isActive && canSetState && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setPin.mutate({
                            id: skill.id,
                            isPinned: !skill.isPinned,
                          })
                        }
                        disabled={setPin.isPending}
                        aria-label={
                          skill.isPinned
                            ? tSkills('card.unpinLabel')
                            : tSkills('card.pinLabel')
                        }
                      >
                        <Pin
                          className={`h-4 w-4 ${skill.isPinned ? 'fill-current' : ''}`}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {skill.isPinned
                        ? tSkills('card.unpinLabel')
                        : tSkills('card.pinLabel')}
                    </TooltipContent>
                  </Tooltip>
                )}
                {!isReadOnly && canManageSkills && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={handleDelete}
                        disabled={deleteSkill.isPending}
                        aria-label={tSkills('card.deleteLabel')}
                      >
                        <Trash2 />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {tSkills('card.deleteLabel')}
                    </TooltipContent>
                  </Tooltip>
                )}
              </>
            }
          />
        }
        contentArea={
          isReadOnly || !canShare ? (
            configContent
          ) : (
            <ConfigurationTabs
              value={initialTab}
              onValueChange={handleTabChange}
              labels={{
                configuration: t('tabs.configuration'),
                shares: t('tabs.shares'),
              }}
              configuration={configContent}
              entityType="skill"
              entityId={skill.id}
              shares={shares}
              userTeams={userTeams}
            />
          )
        }
      />
    </AppLayout>
  );
}
