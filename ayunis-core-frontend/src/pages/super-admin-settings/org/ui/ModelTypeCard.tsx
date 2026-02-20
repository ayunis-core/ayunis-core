import type { ModelWithConfigResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { ModelTypeCard as ModelTypeCardWidget } from '@/widgets/model-type-card';
import { useSuperAdminDeletePermittedModel } from '../api/useSuperAdminDeletePermittedModel';
import { useSuperAdminUpdatePermittedModel } from '../api/useSuperAdminUpdatePermittedModel';
import { useSuperAdminEnableModel } from '../api/useSuperAdminEnableModel';

interface ModelTypeCardProps {
  readonly type: 'language' | 'embedding';
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
