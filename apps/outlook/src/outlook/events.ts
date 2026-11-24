// The manifest names each launch event's handler after the event, and
// public/outlook/events-classic.js registers the same names for classic
// Outlook on Windows. No feature uses an event yet: each completes at once,
// so Outlook never waits on the add-in.
export const OUTLOOK_EVENT_HANDLERS = [
  'onMessageCompose',
  'onMessageRecipientsChanged',
  'onMessageAttachmentsChanged',
  'onMessageFromChanged',
  'onInfoBarDismissClicked',
];

for (const name of OUTLOOK_EVENT_HANDLERS) {
  Office.actions.associate(name, (event: Office.MailboxEvent) => {
    event.completed();
  });
}

// Outlook on the web waits for the Office.js readiness handshake before it
// dispatches an event. Register the handlers before starting it.
void Office.onReady();
