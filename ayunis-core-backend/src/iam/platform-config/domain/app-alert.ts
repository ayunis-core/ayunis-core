/**
 * The persistent app-wide alert banner configuration controlled by super
 * admins. When `enabled` is true the `message` is shown as a warning banner at
 * the top of every authenticated page.
 */
export interface AppAlert {
  enabled: boolean;
  message: string;
}

/** Maximum length of the alert banner message. */
export const APP_ALERT_MESSAGE_MAX_LENGTH = 1000;
