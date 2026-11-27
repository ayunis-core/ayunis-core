import config from '@/shared/config';

/** `updatedAt` changes with every edit, so a replaced image is reloaded. */
export function adventDoorImageUrl(day: number, updatedAt: string): string {
  return `${config.api.baseUrl}/advent-calendar/doors/${day}/image?v=${encodeURIComponent(updatedAt)}`;
}
