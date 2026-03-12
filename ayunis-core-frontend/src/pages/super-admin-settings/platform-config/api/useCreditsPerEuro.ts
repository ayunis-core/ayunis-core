import { AxiosError } from 'axios';
import { useSuperAdminPlatformConfigControllerGetCreditsPerEuro } from '@/shared/api';

function isNotFoundError(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 404;
}

export default function useCreditsPerEuro() {
  const { data, isLoading, isError, error } =
    useSuperAdminPlatformConfigControllerGetCreditsPerEuro({
      query: {
        retry: (failureCount, err) => {
          if (isNotFoundError(err)) return false;
          return failureCount < 3;
        },
      },
    });

  // 404 means the value hasn't been configured yet — not an error
  const isNotConfigured = isNotFoundError(error);

  return {
    creditsPerEuro: data?.creditsPerEuro,
    isLoading,
    isError: isError && !isNotConfigured,
    isNotConfigured,
  };
}
