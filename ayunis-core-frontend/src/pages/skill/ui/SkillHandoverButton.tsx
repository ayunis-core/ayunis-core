import { HandoverButton } from '@/features/resource-handover';
import {
  useSkillKnowledgeBasesControllerListSkillKnowledgeBases,
  useSkillMcpIntegrationsControllerListSkillMcpIntegrations,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function SkillHandoverButton({
  skill,
}: Readonly<{ skill: SkillResponseDto }>) {
  const knowledgeBases =
    useSkillKnowledgeBasesControllerListSkillKnowledgeBases(skill.id);
  const integrations =
    useSkillMcpIntegrationsControllerListSkillMcpIntegrations(skill.id);
  if (knowledgeBases.isLoading || integrations.isLoading) return null;
  const unlinksResources =
    knowledgeBases.data === undefined ||
    integrations.data === undefined ||
    knowledgeBases.data.length > 0 ||
    integrations.data.length > 0;

  return (
    <HandoverButton
      kind="skill"
      item={{ id: skill.id, name: skill.name }}
      unlinksResources={unlinksResources}
    />
  );
}
