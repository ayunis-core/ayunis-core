/** Where a notification comes from, which decides how the inbox shows it. */
export enum NotificationType {
  /** Sent by a routine run with `send_notification`. */
  ROUTINE = 'routine',
  /** Posted by the system when a routine run failed. */
  ROUTINE_ERROR = 'routine_error',
}
