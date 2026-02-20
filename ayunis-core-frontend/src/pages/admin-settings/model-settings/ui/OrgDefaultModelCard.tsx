import type { ModelWithConfigResponseDto } from '@/shared/api';
import { OrgDefaultModelCardWidget } from '@/widgets/org-default-model-card/ui/OrgDefaultModelCardWidget';
import { useManageOrgDefaultModel } from '../api';

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

  return (
    <OrgDefaultModelCardWidget
      models={models}
      isLoading={isLoading}
      isSaving={isSaving}
      onDefaultModelChange={manageOrgDefaultModel}
      selectId="org-default-model-select"
    />
  );
}
