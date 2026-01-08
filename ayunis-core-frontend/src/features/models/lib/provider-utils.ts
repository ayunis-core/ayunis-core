import type { ModelProviderInfoResponseDtoHostedIn } from '@/shared/api/generated/ayunisCoreAPI.schemas';

type HostedIn = ModelProviderInfoResponseDtoHostedIn;

/**
 * Get flag emoji based on hosting location.
 * Derives from hostedIn rather than provider name.
 */
export function getFlagByHostedIn(hostedIn: HostedIn): string {
  const locationFlags: Record<HostedIn, string> = {
    DE: '🇩🇪',
    EU: '🇪🇺',
    US: '🇺🇸',
    SELF_HOSTED: '🇩🇪',
    AYUNIS: '🇩🇪',
  };
  return locationFlags[hostedIn] ?? '';
}

/**
 * Get hosting priority for sorting (lower = higher priority).
 * DE/AYUNIS first, then EU, then US.
 */
export function getHostingPriority(hostedIn: HostedIn): number {
  const priorities: Record<HostedIn, number> = {
    DE: 0,
    AYUNIS: 0,
    SELF_HOSTED: 0,
    EU: 1,
    US: 2,
  };
  return priorities[hostedIn] ?? 3;
}
