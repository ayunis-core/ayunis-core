import {
  useAddonsControllerList,
  getAddonsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { isAcademyAddonActive } from './isAcademyAddonActive';

/**
 * Whether the academy add-on is active for the current user's organization.
 * Used by the sidebar to decide between the in-app academy route and the
 * external landing page.
 */
export function useIsAcademyAddonActive(): boolean {
  const { data } = useAddonsControllerList({
    query: { queryKey: getAddonsControllerListQueryKey() },
  });

  return data ? isAcademyAddonActive(data) : false;
}
