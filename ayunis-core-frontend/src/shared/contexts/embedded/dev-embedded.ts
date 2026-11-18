// Lets `pnpm dev` preview the Outlook pane's embedded mode in a normal tab.
// Production builds ignore the parameter: only the pane entry turns it on.
export function isDevEmbedded(isDev: boolean, search: string): boolean {
  return isDev && new URLSearchParams(search).get('embedded') === '1';
}
