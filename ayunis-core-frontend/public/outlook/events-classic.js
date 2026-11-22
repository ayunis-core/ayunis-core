/* global Office */
// Classic Outlook on Windows loads this file alone in a JavaScript-only
// runtime, so it cannot import src/outlook/events.ts. Keep the names in step
// with it and the manifest.
[
  "onMessageCompose",
  "onMessageRecipientsChanged",
  "onMessageAttachmentsChanged",
  "onMessageFromChanged",
  "onInfoBarDismissClicked",
].forEach(function (name) {
  Office.actions.associate(name, function (event) {
    event.completed();
  });
});
