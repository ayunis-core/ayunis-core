import { useSuperAdminPlatformConfigControllerGetCreditsPerEuro } from '@/shared/api';

export default function useCreditsPerEuro() {
  const { data, isLoading, isError } =
    useSuperAdminPlatformConfigControllerGetCreditsPerEuro();

  return {
    creditsPerEuro: data?.creditsPerEuro,
    isLoading,
    isError,
  };
}
