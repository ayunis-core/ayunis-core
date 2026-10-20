import { useSuperAdminPlatformConfigControllerGetAcademyMinimumModuleSeconds } from '@/shared/api';

export default function useAcademyMinimumModuleSeconds() {
  const { data, isLoading, isError } =
    useSuperAdminPlatformConfigControllerGetAcademyMinimumModuleSeconds();

  return { seconds: data?.seconds, isLoading, isError };
}
