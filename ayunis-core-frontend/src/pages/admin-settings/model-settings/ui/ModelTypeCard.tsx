import type { ModelWithConfigResponseDto } from '@ayunis/api-client/schemas';
import { ModelTypeCard as ModelTypeCardWidget } from '@/widgets/model-type-card';
import { useDeletePermittedModel } from '@/pages/admin-settings/model-settings/api/useDeletePermittedModel';
import { useUpdatePermittedModel } from '@/pages/admin-settings/model-settings/api/useUpdatePermittedModel';
import { useEnableModel } from '@/pages/admin-settings/model-settings/api/useEnableModel';

interface ModelTypeCardProps {
  readonly type: 'language' | 'embedding' | 'image-generation';
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
