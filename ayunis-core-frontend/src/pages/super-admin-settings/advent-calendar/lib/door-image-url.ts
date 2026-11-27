import config from '@/shared/config';

/** `updatedAt` changes with every edit, so a replaced image is not served from the cache. */
export function doorImageUrl(day: number, updatedAt: string): string {
  const version = encodeURIComponent(updatedAt);
  return `${config.api.baseUrl}/super-admin/advent-calendar/doors/${day}/image?v=${version}`;
}
