import { AddonType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { AddonStatusResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

/**
 * Whether the academy add-on is active in a list of org add-on statuses.
 * Shared by the sidebar hook and the `/academy` route guard.
 */
export function isAcademyAddonActive(
  addons: AddonStatusResponseDto[],
): boolean {
  return addons.some(
    (addon) =>
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- AddonType currently has a single member, so this comparison narrows to always-true; the type guard is intentional so the check stays correct once more add-ons exist.
      addon.type === AddonType.ayunis_core_academy && addon.active,
  );
}
