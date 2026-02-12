import { useGlobalModelDistribution } from '../api/useGlobalModelDistribution';
import { ModelDistributionWidget } from '@/widgets/model-distribution-chart';

interface GlobalModelDistributionProps {
  startDate?: Date;
  endDate?: Date;
  selectedModel?: string;
}

export function GlobalModelDistribution({
  startDate,
  endDate,
  selectedModel,
}: GlobalModelDistributionProps) {
  const {
    data: modelDistribution,
    isLoading,
    error,
  } = useGlobalModelDistribution({
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
