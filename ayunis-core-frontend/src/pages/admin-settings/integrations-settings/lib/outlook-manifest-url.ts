// A production build calls the API on its own origin ('/api'); development
// points at the backend's absolute address.
export function outlookManifestUrl(apiBaseUrl: string, origin: string): string {
  return new URL(`${apiBaseUrl}/office-addins/outlook/manifest.xml`, origin)
    .href;
}
