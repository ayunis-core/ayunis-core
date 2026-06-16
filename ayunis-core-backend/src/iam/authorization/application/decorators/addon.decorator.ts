import { SetMetadata } from '@nestjs/common';
import type { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';

export const REQUIRE_ADDON_KEY = 'requiresAddon';

/**
 * Decorator to mark routes that require an add-on to be active for the
 * caller's organization. Access is denied (403) when the add-on is not active.
 *
 * @example
 * ```typescript
 * @RequireAddon(AddonType.AYUNIS_CORE_ACADEMY)
 * @Get('academy/chapters')
 * getChapters() {}
 * ```
 */
export const RequireAddon = (type: AddonType) =>
  SetMetadata(REQUIRE_ADDON_KEY, type);
