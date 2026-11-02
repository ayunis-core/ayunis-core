import type { ModelWithConfigResponseDto } from '@/shared/api';
import { useModelModeDefault } from '@/features/model-mode-defaults';
import { OrgDefaultModelCardWidget } from '@/widgets/org-default-model-card/ui/OrgDefaultModelCardWidget';
import { useManageOrgDefaultModel } from '@/pages/admin-settings/model-settings/api';

interface OrgDefaultModelCardProps {
  models: ModelWithConfigResponseDto[];
  isLoading: boolean;
}

export function OrgDefaultModelCard({
  models,
  isLoading,
}: Readonly<OrgDefaultModelCardProps>) {
  const { manageOrgDefaultModel, isLoading: isSaving } =
    useManageOrgDefaultModel();

  const modeDefault = useModelModeDefault({ level: 'org' });

  return (
    <OrgDefaultModelCardWidget
      models={models}
      isLoading={isLoading}
      isSaving={isSaving}
      onDefaultModelChange={manageOrgDefaultModel}
      modeDefault={{
        mode: modeDefault.mode,
        currentPermittedModelId: modeDefault.currentPermittedModelId,
        availableModes: modeDefault.availableModes,
        isLoading: modeDefault.isLoading,
        isSaving: modeDefault.isSaving,
        onModeChange: modeDefault.setMode,
      }}
      selectId="org-default-model-select"
    />
  );
}
