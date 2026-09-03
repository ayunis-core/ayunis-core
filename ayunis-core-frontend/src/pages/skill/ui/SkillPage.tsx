import AppLayout from '@/layouts/app-layout';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type {
  ShareResponseDto,
  TeamResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import SkillPropertiesCard from './SkillPropertiesCard';
import SkillKnowledgeBasesCard from './SkillKnowledgeBasesCard';
import { KnowledgeBaseCard } from '@/widgets/knowledge-base-card';
import SkillMcpIntegrationsCard from './SkillMcpIntegrationsCard';
import { SharesTab } from '@/widgets/shares-tab';
import { useMyPermissions } from '@/features/permissions';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@ayunis/ui/components/tabs';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Switch } from '@ayunis/ui/components/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { Trash2 } from 'lucide-react';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDeleteSkill, useSkillSources } from '@/pages/skill/api';
import { useToggleSkillActive } from '@/features/skill-actions';

export function SkillPage({
  skill,
  shares,
  userTeams,
  isEmbeddingModelEnabled,
  initialTab = 'config',
}: Readonly<{
  skill: SkillResponseDto;
  shares: ShareResponseDto[];
  userTeams: TeamResponseDto[];
  isEmbeddingModelEnabled: boolean;
  initialTab?: 'config' | 'share';
}>) {
  const navigate = useNavigate();
  const { t } = useTranslation('skill');
  const { id } = useParams({
    from: '/_authenticated/skills/$id',
  });
  const { t: tSkills } = useTranslation('skills');
  const deleteSkill = useDeleteSkill();
  const toggleActive = useToggleSkillActive();
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

  const isReadOnly = skill.isShared;
  const { can } = useMyPermissions();
  const canManageSkills = can('manage_skills');

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
              isReadOnly ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{t('shared.badge')}</Badge>
                  {skill.creatorName && (
                    <span className="text-sm text-muted-foreground">
                      {t('shared.by', { name: skill.creatorName })}
                    </span>
                  )}
                </div>
              ) : undefined
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
                  <Switch
                    checked={skill.isActive}
                    onCheckedChange={() =>
                      toggleActive.mutate({ id: skill.id })
                    }
                    disabled={toggleActive.isPending}
                  />
                </div>
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
          isReadOnly ? (
            <div className="grid gap-4">
              <SkillPropertiesCard skill={skill} disabled />
              {isEmbeddingModelEnabled && <SkillKnowledgeBasesCard disabled />}
              <SkillMcpIntegrationsCard disabled />
              <KnowledgeBaseCard
                entity={skill}
                isEnabled={isEmbeddingModelEnabled}
                disabled
                translationNamespace="skill"
                sourcesHook={sourcesHook}
              />
            </div>
          ) : (
            <Tabs
              value={initialTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="config">
                  {t('tabs.configuration')}
                </TabsTrigger>
                <TabsTrigger value="share">{t('tabs.shares')}</TabsTrigger>
              </TabsList>
              <TabsContent value="config" className="mt-4">
                <div className="grid gap-4">
                  <SkillPropertiesCard
                    skill={skill}
                    disabled={!canManageSkills}
                  />
                  {isEmbeddingModelEnabled && (
                    <SkillKnowledgeBasesCard disabled={!canManageSkills} />
                  )}
                  <SkillMcpIntegrationsCard disabled={!canManageSkills} />
                  <KnowledgeBaseCard
                    entity={skill}
                    isEnabled={isEmbeddingModelEnabled}
                    disabled={!canManageSkills}
                    translationNamespace="skill"
                    sourcesHook={sourcesHook}
                  />
                </div>
              </TabsContent>
              <TabsContent value="share" className="mt-4">
                <SharesTab
                  entityType="skill"
                  entityId={skill.id}
                  shares={shares}
                  userTeams={userTeams}
                />
              </TabsContent>
            </Tabs>
          )
        }
      />
    </AppLayout>
  );
}
