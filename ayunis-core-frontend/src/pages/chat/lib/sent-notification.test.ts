import { describe, expect, it } from 'vitest';
import { sentNotificationFromToolResult } from './sent-notification';

const NOTIFICATION_ID = '66666666-6666-4666-8666-666666666666';

describe('sentNotificationFromToolResult', () => {
  it('links the card to the notification the call sent', () => {
    const result = JSON.stringify({
      notificationId: NOTIFICATION_ID,
      message: "The notification was sent to the user's inbox.",
    });

    expect(sentNotificationFromToolResult(result)).toEqual({
      notificationId: NOTIFICATION_ID,
    });
  });

  it('still shows a notification sent before results carried its id, without a link', () => {
    expect(
      sentNotificationFromToolResult(
        "The notification was sent to the user's inbox.",
      ),
    ).toEqual({ notificationId: null });
  });

  it('shows no card for a call the backend rejected, so a failed send does not look sent', () => {
    expect(
      sentNotificationFromToolResult(
        "The tool didn't provide any result due to the following error in tool usage: This run already sent the maximum of 3 notifications",
      ),
    ).toBeNull();
  });

  it('shows no card for a call without a result', () => {
    expect(sentNotificationFromToolResult(undefined)).toBeNull();
  });
});
