/** When a notification arrived, in the browser's locale and time zone. */
export function formatNotificationTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
