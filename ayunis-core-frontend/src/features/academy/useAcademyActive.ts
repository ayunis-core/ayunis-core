import { useAddonsControllerList } from '@/shared/api/generated/ayunisCoreAPI';
import { isAcademyAddonActive } from './isAcademyAddonActive';

/**
 * Whether the academy add-on is active for the current user's organization.
 * Defaults to `false` while loading or when the request fails, so the academy
 * surface stays hidden until activation is confirmed.
 */
export function useAcademyActive(): boolean {
  const { data } = useAddonsControllerList();

  return isAcademyAddonActive(data ?? []);
}
