import AppLayout from '@/layouts/app-layout';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type {
  ShareResponseDto,
  TeamResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import SkillPropertiesCard from './SkillPropertiesCard';
import { KnowledgeBaseCard } from '@/widgets/knowledge-base-card';
import SkillMcpIntegrationsCard from './SkillMcpIntegrationsCard';
import { SharesTab } from '@/widgets/shares-tab';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/ui/shadcn/tabs';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/shadcn/button';
import { Switch } from '@/shared/ui/shadcn/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { Trash2, Pin } from 'lucide-react';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDeleteSkill, useSkillSources } from '../api';
import {
  useToggleSkillActive,
  useToggleSkillPinned,
} from '@/features/skill-actions';

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
  const togglePinned = useToggleSkillPinned();
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

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            title={skill.name}
            badge={
              isReadOnly ? (
                <Badge variant="secondary">{t('shared.badge')}</Badge>
              ) : undefined
            }
            action={
              <>
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
                {skill.isActive && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePinned.mutate({ id: skill.id })}
                        disabled={togglePinned.isPending}
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
                {!isReadOnly && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDelete}
                        disabled={deleteSkill.isPending}
                        aria-label={tSkills('card.deleteLabel')}
                      >
                        <Trash2 className="h-4 w-4" />
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
              <KnowledgeBaseCard
                entity={skill}
                isEnabled={isEmbeddingModelEnabled}
                disabled
                translationNamespace="skill"
                sourcesHook={sourcesHook}
              />
              <SkillMcpIntegrationsCard disabled />
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
                  <SkillPropertiesCard skill={skill} />
                  <KnowledgeBaseCard
                    entity={skill}
                    isEnabled={isEmbeddingModelEnabled}
                    translationNamespace="skill"
                    sourcesHook={sourcesHook}
                  />
                  <SkillMcpIntegrationsCard />
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
