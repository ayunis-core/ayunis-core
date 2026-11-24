import { useSuperAdminUsageControllerGetCreditUsage } from '@ayunis/api-client';

interface UseSuperAdminCreditUsageProps {
  orgId: string;
}

export default function useSuperAdminCreditUsage({
  orgId,
}: UseSuperAdminCreditUsageProps) {
  const { data, isLoading, isError } =
    useSuperAdminUsageControllerGetCreditUsage(orgId, {
      query: { enabled: !!orgId },
    });

  return { creditUsage: data, isLoading, isError };
}
