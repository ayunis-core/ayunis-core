import { useSuperAdminModelDistribution } from '../api/useSuperAdminModelDistribution';
import { ModelDistributionWidget } from '@/widgets/model-distribution-chart';

interface SuperAdminModelDistributionProps {
  orgId: string;
  startDate?: Date;
  endDate?: Date;
  selectedModel?: string;
}

export function SuperAdminModelDistribution({
  orgId,
  startDate,
  endDate,
  selectedModel,
}: SuperAdminModelDistributionProps) {
  const {
    data: modelDistribution,
    isLoading,
    error,
  } = useSuperAdminModelDistribution(orgId, {
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
