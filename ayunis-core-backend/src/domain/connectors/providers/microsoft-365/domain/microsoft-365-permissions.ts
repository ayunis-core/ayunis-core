/**
 * Microsoft Graph application permissions Ayunis uses. IT grants the sites
 * Ayunis may read on top of them, so none of them reaches a site on its own.
 */
export const MICROSOFT_365_PERMISSIONS = [
  { name: 'Sites.Selected', required: true },
  { name: 'Files.SelectedOperations.Selected', required: false },
  { name: 'Lists.SelectedOperations.Selected', required: false },
] as const;
