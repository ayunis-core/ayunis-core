import type { ModelWithConfigResponseDto } from '@/shared/api';
import { OrgDefaultModelCardWidget } from '@/widgets/org-default-model-card/ui/OrgDefaultModelCardWidget';
import { useSetTeamDefaultModel } from '../api/useSetTeamDefaultModel';

interface TeamDefaultModelCardProps {
  readonly teamId: string;
  readonly models: ModelWithConfigResponseDto[];
  readonly isLoading: boolean;
}

export function TeamDefaultModelCard({
  teamId,
  models,
  isLoading,
}: TeamDefaultModelCardProps) {
  const { setTeamDefaultModel, isSetting } = useSetTeamDefaultModel(teamId);
  const permittedModels = models.filter((model) => model.isPermitted);

  return (
    <OrgDefaultModelCardWidget
      models={permittedModels}
      isLoading={isLoading}
      isSaving={isSetting}
      onDefaultModelChange={setTeamDefaultModel}
      selectId="team-default-model-select"
      translationNamespace="admin-settings-teams"
    />
  );
}
