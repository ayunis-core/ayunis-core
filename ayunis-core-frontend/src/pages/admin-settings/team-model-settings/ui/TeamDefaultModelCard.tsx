import type { ModelWithConfigResponseDto } from '@/shared/api';
import { useModelModeDefault } from '@/features/model-mode-defaults';
import { OrgDefaultModelCardWidget } from '@/widgets/org-default-model-card/ui/OrgDefaultModelCardWidget';
import { useSetTeamDefaultModel } from '@/pages/admin-settings/team-model-settings/api/useSetTeamDefaultModel';

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

  const modeDefault = useModelModeDefault({ level: 'team', teamId });

  return (
    <OrgDefaultModelCardWidget
      models={permittedModels}
      isLoading={isLoading}
      isSaving={isSetting}
      onDefaultModelChange={setTeamDefaultModel}
      modeDefault={{
        mode: modeDefault.mode,
        currentPermittedModelId: modeDefault.currentPermittedModelId,
        availableModes: modeDefault.availableModes,
        isLoading: modeDefault.isLoading,
        isSaving: modeDefault.isSaving,
        onModeChange: modeDefault.setMode,
      }}
      selectId="team-default-model-select"
      translationNamespace="admin-settings-teams"
    />
  );
}
