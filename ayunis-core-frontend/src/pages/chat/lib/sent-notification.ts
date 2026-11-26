// Results before the backend returned the notification id.
const LEGACY_SENT_RESULT = "The notification was sent to the user's inbox.";

export interface SentNotification {
  /** null for a notification sent before results carried its id. */
  notificationId: string | null;
}

/** null unless the `send_notification` call's result says it was sent. */
export function sentNotificationFromToolResult(
  result: string | undefined,
): SentNotification | null {
  if (!result) return null;
  if (result === LEGACY_SENT_RESULT) return { notificationId: null };
  try {
    const parsed: unknown = JSON.parse(result);
    const notificationId =
      typeof parsed === 'object' && parsed !== null
        ? (parsed as { notificationId?: unknown }).notificationId
        : undefined;
    return typeof notificationId === 'string' ? { notificationId } : null;
  } catch {
    return null;
  }
}
