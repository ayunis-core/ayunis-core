import type { ModelWithConfigResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { ModelTypeCard as ModelTypeCardWidget } from '@/widgets/model-type-card';
import { useDeletePermittedModel } from '../api/useDeletePermittedModel';
import { useUpdatePermittedModel } from '../api/useUpdatePermittedModel';
import { useEnableModel } from '../api/useEnableModel';

interface ModelTypeCardProps {
  readonly type: 'language' | 'embedding';
  readonly models: ModelWithConfigResponseDto[];
}

export default function ModelTypeCard({ type, models }: ModelTypeCardProps) {
  const { deletePermittedModel } = useDeletePermittedModel();
  const { updatePermittedModel } = useUpdatePermittedModel();
  const { enableModel, isEnabling } = useEnableModel();

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
