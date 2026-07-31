import {
  useAcademyAccessControllerGetStatus,
  getAcademyAccessControllerGetStatusQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { AcademyAccessStatusResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface AcademyAccessStatus {
  status: AcademyAccessStatusResponseDto | undefined;
  /**
   * Whether the certificate gate is currently blocking this user. Stays false
   * while the status is loading or errored: an outage of the access endpoint
   * must never lock people out of the product.
   */
  isGated: boolean;
  isLoading: boolean;
}

export function useAcademyAccessStatus(): AcademyAccessStatus {
  const { data, isLoading } = useAcademyAccessControllerGetStatus({
    query: {
      queryKey: getAcademyAccessControllerGetStatusQueryKey(),
      // The global client retries 5xx three times with backoff, which would
      // leave the composer disabled for seconds during an outage.
      retry: false,
    },
  });

  return {
    status: data,
    isGated: data ? !data.allowed : false,
    isLoading,
  };
}
