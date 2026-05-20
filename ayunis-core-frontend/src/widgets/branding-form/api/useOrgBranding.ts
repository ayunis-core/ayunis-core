import {
  useBrandingControllerGet,
  getBrandingControllerGetQueryKey,
  useSuperAdminBrandingControllerGet,
  getSuperAdminBrandingControllerGetQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

/**
 * Branding query for the branding form. Without an orgId it reads the
 * current org's branding (admin settings); with an orgId it reads any
 * org's branding via the super-admin endpoint.
 */
export function useOrgBranding(orgId?: string) {
  const own = useBrandingControllerGet({
    query: {
      queryKey: getBrandingControllerGetQueryKey(),
      enabled: !orgId,
    },
  });

  const byOrg = useSuperAdminBrandingControllerGet(orgId ?? '', {
    query: {
      queryKey: getSuperAdminBrandingControllerGetQueryKey(orgId ?? ''),
      enabled: !!orgId,
    },
  });

  const active = orgId ? byOrg : own;

  return {
    branding: active.data,
    isLoading: active.isLoading,
    error: active.error,
  };
}
