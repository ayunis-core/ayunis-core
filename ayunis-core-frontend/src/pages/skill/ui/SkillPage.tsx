import AppLayout from '@/layouts/app-layout';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import { SkillPropertiesCard } from '@/widgets/resource-properties-card';
import { KnowledgeBaseCard } from '@/widgets/knowledge-base-card';
import { ReadOnlyBadge } from '@/features/resource-ownership';
import {
  useHandoverState,
  type HandoverState,
} from '@/features/resource-handover';
import { useNavigate, useRouter } from '@tanstack/react-router';
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
import { SkillHandoverButton } from './SkillHandoverButton';
import { SkillOwnershipSection } from './SkillOwnershipSection';

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
  handover,
  onDecided,
}: Readonly<{
  skill: SkillResponseDto;
  isEmbeddingModelEnabled: boolean;
  handover: HandoverState;
  onDecided: () => Promise<void>;
}>) {
  const access = skillAccess(skill);
  const sourcesHook = useSkillSources({ skill });
  const updateProperties = useUpdateSkillProperties(skill.id);
  const linksResources = !access.isCollective && !handover.isReviewing;
  const isReadOnly =
    (access.isCollective && !access.canEdit) || handover.isReviewing;

  return (
    <div className="grid gap-4">
      <SkillOwnershipSection
        skill={skill}
        handover={handover}
        onDecided={onDecided}
      />
      {isReadOnly ? (
        <SkillReadOnlyContent
          trigger={skill.shortDescription}
          instructions={skill.instructions}
          showDescription={!handover.isReviewing}
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
  const handover = useHandoverState('skill', skill);
  const navigate = useNavigate();
  const leaveAfterDecision = () =>
    navigate({ to: '/skills', search: { tab: 'requests' } });

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
            action={
              <SkillHeaderActions
                skill={skill}
                access={access}
                handoverAction={
                  handover.mayHandOver ? (
                    <SkillHandoverButton skill={skill} />
                  ) : null
                }
              />
            }
          />
        }
        contentArea={
          <SkillConfiguration
            skill={skill}
            isEmbeddingModelEnabled={isEmbeddingModelEnabled}
            handover={handover}
            onDecided={leaveAfterDecision}
          />
        }
      />
    </AppLayout>
  );
}
