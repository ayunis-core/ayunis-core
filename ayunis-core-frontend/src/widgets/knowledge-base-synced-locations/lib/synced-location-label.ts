import {
  SyncedLocationProvider,
  type SyncedLocationResponseDto,
} from '@ayunis/api-client/schemas';

/**
 * A website by its host and URL; a connector location by the last segment of
 * its URL and its decoded path.
 */
export function syncedLocationLabel({
  provider,
  location: url,
}: Pick<SyncedLocationResponseDto, 'provider' | 'location'>): {
  name: string;
  path: string;
} {
  try {
    const parsed = new URL(url);
    if (provider === SyncedLocationProvider.web)
      return { name: parsed.hostname.replace(/^www\./, ''), path: url };
    const segments = parsed.pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
    return { name: segments.at(-1) ?? url, path: segments.join(' / ') };
  } catch {
    return { name: url, path: url };
  }
}
