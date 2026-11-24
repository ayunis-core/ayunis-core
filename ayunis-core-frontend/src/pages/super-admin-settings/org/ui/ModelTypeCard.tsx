import type { ModelWithConfigResponseDto } from '@ayunis/api-client/schemas';
import { ModelTypeCard as ModelTypeCardWidget } from '@/widgets/model-type-card';
import { useSuperAdminDeletePermittedModel } from '@/pages/super-admin-settings/org/api/useSuperAdminDeletePermittedModel';
import { useSuperAdminUpdatePermittedModel } from '@/pages/super-admin-settings/org/api/useSuperAdminUpdatePermittedModel';
import { useSuperAdminEnableModel } from '@/pages/super-admin-settings/org/api/useSuperAdminEnableModel';

interface ModelTypeCardProps {
  readonly type: 'language' | 'embedding' | 'image-generation';
  readonly models: ModelWithConfigResponseDto[];
  readonly orgId: string;
}

export default function ModelTypeCard({
  type,
  models,
  orgId,
}: ModelTypeCardProps) {
  const { deletePermittedModel } = useSuperAdminDeletePermittedModel(orgId);
  const { updatePermittedModel } = useSuperAdminUpdatePermittedModel(orgId);
  const { enableModel, isEnabling } = useSuperAdminEnableModel(orgId);

  return (
    <ModelTypeCardWidget
      type={type}
      models={models}
      actions={{
        deletePermittedModel,
        updatePermittedModel,
        enableModel,
        isEnabling,
      }}
    />
  );
}
