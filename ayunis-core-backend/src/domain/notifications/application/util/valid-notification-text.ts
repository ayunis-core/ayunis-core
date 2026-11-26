import { NotificationInvalidError } from 'src/domain/notifications/application/notifications.errors';
import {
  NOTIFICATION_BODY_MAX_LENGTH,
  NOTIFICATION_HEADLINE_MAX_LENGTH,
  NOTIFICATION_SUBHEADLINE_MAX_LENGTH,
} from 'src/domain/notifications/domain/notifications.constants';

export interface NotificationText {
  headline: string;
  subheadline: string | null;
  body: string;
}

/**
 * Trims the texts and rejects empty or over-long ones. A subheadline may be
 * left out, but a given one must not be blank.
 */
export function validNotificationText(
  text: NotificationText,
): NotificationText {
  return {
    headline: requiredText(
      'headline',
      text.headline,
      NOTIFICATION_HEADLINE_MAX_LENGTH,
    ),
    subheadline:
      text.subheadline === null
        ? null
        : requiredText(
            'subheadline',
            text.subheadline,
            NOTIFICATION_SUBHEADLINE_MAX_LENGTH,
          ),
    body: requiredText('body', text.body, NOTIFICATION_BODY_MAX_LENGTH),
  };
}

function requiredText(field: string, value: string, maxLength: number): string {
  const text = value.trim();
  if (text.length === 0) {
    throw new NotificationInvalidError(`${field} is empty`);
  }
  if (text.length > maxLength) {
    throw new NotificationInvalidError(
      `${field} is longer than ${maxLength} characters`,
    );
  }
  return text;
}
