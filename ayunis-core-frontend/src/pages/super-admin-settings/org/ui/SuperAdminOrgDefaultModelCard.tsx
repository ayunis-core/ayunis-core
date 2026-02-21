import type { ModelWithConfigResponseDto } from '@/shared/api';
import { OrgDefaultModelCardWidget } from '@/widgets/org-default-model-card/ui/OrgDefaultModelCardWidget';
import { useSuperAdminManageOrgDefaultModel } from '../api/useSuperAdminManageOrgDefaultModel';

interface SuperAdminOrgDefaultModelCardProps {
  models: ModelWithConfigResponseDto[];
  isLoading: boolean;
  orgId: string;
}

export function SuperAdminOrgDefaultModelCard({
  models,
  isLoading,
  orgId,
}: Readonly<SuperAdminOrgDefaultModelCardProps>) {
  const { manageOrgDefaultModel, isLoading: isSaving } =
    useSuperAdminManageOrgDefaultModel(orgId);

  return (
    <OrgDefaultModelCardWidget
      models={models}
      isLoading={isLoading}
      isSaving={isSaving}
      onDefaultModelChange={manageOrgDefaultModel}
      selectId="super-admin-org-default-model-select"
    />
  );
}
