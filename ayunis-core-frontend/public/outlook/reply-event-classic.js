/* global Office */
// Classic Outlook's JavaScript-only event runtime cannot read the browser handoff.
Office.actions.associate("insertOutlookReplyDraft", function (event) {
  event.completed();
});
