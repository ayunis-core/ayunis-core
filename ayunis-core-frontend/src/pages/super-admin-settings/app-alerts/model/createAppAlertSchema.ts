import { z } from 'zod';
import type { TFunction } from 'i18next';

const APP_ALERT_MESSAGE_MAX_LENGTH = 1000;

/**
 * Validation for the app-wide alert banner form. A message is only required
 * when the banner is enabled — disabling it may leave the message empty.
 */
export function createAppAlertSchema(t: TFunction) {
  return z
    .object({
      enabled: z.boolean(),
      message: z
        .string()
        .max(APP_ALERT_MESSAGE_MAX_LENGTH, t('validation.message.maxLength')),
    })
    .refine((data) => !data.enabled || data.message.trim().length > 0, {
      path: ['message'],
      message: t('validation.message.required'),
    });
}
