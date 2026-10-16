import AppLayout from '@/layouts/app-layout';
import type {
  ShareResponseDto,
  SkillResponseDto,
  TeamResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import { SkillPropertiesCard } from '@/widgets/resource-properties-card';
import { KnowledgeBaseCard } from '@/widgets/knowledge-base-card';
import { SharesTab } from '@/widgets/shares-tab';
import {
  ResourceOwnershipCard,
  showsOwnershipCard,
} from '@/widgets/resource-ownership-card';
import { ReadOnlyBadge } from '@/features/resource-ownership';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@ayunis/ui/components/tabs';
import { Badge } from '@ayunis/ui/components/badge';
import { useNavigate, useParams, useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  skillsControllerUpdate,
  getSkillsControllerFindAllQueryKey,
  getSkillsControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalSkillListParams } from '@/shared/api/skill-scopes';
import { useSkillSources } from '@/pages/skill/api';
import { skillAccess } from '@/pages/skill/model/skill-access';
import SkillKnowledgeBasesCard from './SkillKnowledgeBasesCard';
import SkillMcpIntegrationsCard from './SkillMcpIntegrationsCard';
import { SkillHeaderActions } from './SkillHeaderActions';
import { SkillReadOnlyContent } from './SkillReadOnlyContent';

function useUpdateSkillProperties(skillId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return async (data: Parameters<typeof skillsControllerUpdate>[1]) => {
    await skillsControllerUpdate(skillId, data);
    await Promise.all(
      [
        getSkillsControllerFindAllQueryKey(personalSkillListParams),
        getSkillsControllerFindOneQueryKey(skillId),
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
    await router.invalidate();
  };
}

function SkillHeaderBadge({ skill }: Readonly<{ skill: SkillResponseDto }>) {
  const { t } = useTranslation('skill');
  if (skill.isShared) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{t('shared.badge')}</Badge>
        {skill.creatorName && (
          <span className="text-sm text-muted-foreground">
            {t('shared.by', { name: skill.creatorName })}
          </span>
        )}
      </div>
    );
  }
  return skillAccess(skill).canEdit ? null : <ReadOnlyBadge />;
}

function SkillConfiguration({
  skill,
  isEmbeddingModelEnabled,
}: Readonly<{ skill: SkillResponseDto; isEmbeddingModelEnabled: boolean }>) {
  const access = skillAccess(skill);
  const sourcesHook = useSkillSources({ skill });
  const updateProperties = useUpdateSkillProperties(skill.id);
  const linksResources = !access.isCollective;
  const isReadOnlyCollective = access.isCollective && !access.canEdit;

  return (
    <div className="grid gap-4">
      {showsOwnershipCard(skill) && (
        <ResourceOwnershipCard kind="skill" resource={skill} />
      )}
      {isReadOnlyCollective ? (
        <SkillReadOnlyContent
          trigger={skill.shortDescription}
          instructions={skill.instructions}
        />
      ) : (
        <SkillPropertiesCard
          key={skill.id}
          skill={skill}
          disabled={!access.canEdit}
          onUpdate={updateProperties}
        />
      )}
      {linksResources && isEmbeddingModelEnabled && (
        <SkillKnowledgeBasesCard disabled={!access.canEdit} />
      )}
      {linksResources && (
        <SkillMcpIntegrationsCard disabled={!access.canEdit} />
      )}
      <KnowledgeBaseCard
        entity={skill}
        isEnabled={isEmbeddingModelEnabled}
        disabled={!access.canEdit}
        translationNamespace="skill"
        sourcesHook={sourcesHook}
      />
    </div>
  );
}

function OwnSkillTabs({
  skill,
  shares,
  userTeams,
  isEmbeddingModelEnabled,
  initialTab,
}: Readonly<{
  skill: SkillResponseDto;
  shares: ShareResponseDto[];
  userTeams: TeamResponseDto[];
  isEmbeddingModelEnabled: boolean;
  initialTab: 'config' | 'share';
}>) {
  const navigate = useNavigate();
  const { t } = useTranslation('skill');
  const { id } = useParams({ from: '/_authenticated/skills/$id' });
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

  return (
    <Tabs value={initialTab} onValueChange={handleTabChange} className="w-full">
      <TabsList>
        <TabsTrigger value="config">{t('tabs.configuration')}</TabsTrigger>
        <TabsTrigger value="share">{t('tabs.shares')}</TabsTrigger>
      </TabsList>
      <TabsContent value="config" className="mt-4">
        <SkillConfiguration
          skill={skill}
          isEmbeddingModelEnabled={isEmbeddingModelEnabled}
        />
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
  );
}

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
  const { t } = useTranslation('skill');
  const isOwnPersonal = skill.ownerType === 'personal' && !skill.isShared;

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: t('breadcrumb.skills'), href: '/skills' },
              { label: skill.name },
            ]}
            badge={<SkillHeaderBadge skill={skill} />}
            action={
              <SkillHeaderActions skill={skill} access={skillAccess(skill)} />
            }
          />
        }
        contentArea={
          isOwnPersonal ? (
            <OwnSkillTabs
              skill={skill}
              shares={shares}
              userTeams={userTeams}
              isEmbeddingModelEnabled={isEmbeddingModelEnabled}
              initialTab={initialTab}
            />
          ) : (
            <SkillConfiguration
              skill={skill}
              isEmbeddingModelEnabled={isEmbeddingModelEnabled}
            />
          )
        }
      />
    </AppLayout>
  );
}
