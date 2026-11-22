/** The last segment of a location's URL as its name, and its decoded path. */
export function syncedLocationLabel(url: string): {
  name: string;
  path: string;
} {
  try {
    const segments = new URL(url).pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
    return { name: segments.at(-1) ?? url, path: segments.join(' / ') };
  } catch {
    return { name: url, path: url };
  }
}
