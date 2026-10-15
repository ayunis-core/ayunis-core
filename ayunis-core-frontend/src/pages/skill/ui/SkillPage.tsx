import AppLayout from '@/layouts/app-layout';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import { SkillPropertiesCard } from '@/widgets/resource-properties-card';
import { KnowledgeBaseCard } from '@/widgets/knowledge-base-card';
import {
  ResourceOwnershipCard,
  showsOwnershipCard,
} from '@/widgets/resource-ownership-card';
import { ReadOnlyBadge } from '@/features/resource-ownership';
import { useRouter } from '@tanstack/react-router';
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

export function SkillPage({
  skill,
  isEmbeddingModelEnabled,
}: Readonly<{
  skill: SkillResponseDto;
  isEmbeddingModelEnabled: boolean;
}>) {
  const { t } = useTranslation('skill');
  const access = skillAccess(skill);

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: t('breadcrumb.skills'), href: '/skills' },
              { label: skill.name },
            ]}
            badge={access.canEdit ? null : <ReadOnlyBadge />}
            action={<SkillHeaderActions skill={skill} access={access} />}
          />
        }
        contentArea={
          <SkillConfiguration
            skill={skill}
            isEmbeddingModelEnabled={isEmbeddingModelEnabled}
          />
        }
      />
    </AppLayout>
  );
}
