import { useModelDistribution } from '@/pages/admin-settings/usage-settings/api';
import { ModelDistributionWidget } from '@/widgets/model-distribution-chart';

interface ModelDistributionProps {
  startDate?: Date;
  endDate?: Date;
  selectedModel?: string;
}

export function ModelDistribution({
  startDate,
  endDate,
  selectedModel,
}: Readonly<ModelDistributionProps>) {
  const {
    data: modelDistribution,
    isLoading,
    error,
  } = useModelDistribution({
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    modelId: selectedModel,
  });

  return (
    <ModelDistributionWidget
      models={modelDistribution?.models}
      isLoading={isLoading}
      error={error}
    />
  );
}
