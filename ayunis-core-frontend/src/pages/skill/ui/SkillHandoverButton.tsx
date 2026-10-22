import { HandoverButton } from '@/features/resource-handover';
import { useSkillMcpIntegrationsControllerListSkillMcpIntegrations } from '@/shared/api/generated/ayunisCoreAPI';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function SkillHandoverButton({
  skill,
}: Readonly<{ skill: SkillResponseDto }>) {
  const integrations =
    useSkillMcpIntegrationsControllerListSkillMcpIntegrations(skill.id);
  if (integrations.isLoading) return null;
  const unlinksResources =
    integrations.data === undefined || integrations.data.length > 0;

  return (
    <HandoverButton
      kind="skill"
      item={{ id: skill.id, name: skill.name }}
      unlinksResources={unlinksResources}
    />
  );
}
