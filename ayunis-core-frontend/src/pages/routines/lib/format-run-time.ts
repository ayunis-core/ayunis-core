/** A run time in the browser's locale and time zone, like the chat lists. */
export function formatRunTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
