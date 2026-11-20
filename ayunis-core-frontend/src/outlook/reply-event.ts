import { officeAsync } from '@/features/outlook-tools/lib/office-async';
import {
  currentOutlookItem,
  currentOutlookMailboxItem,
  currentOutlookReplySourceKey,
} from '@/features/outlook-tools/lib/outlook-item';
import {
  outlookReplyAccount,
  OUTLOOK_REPLY_DRAFT_LOCK,
  pendingReplyDraft,
  purgeExpiredReplyDraft,
  takePendingReplyDraft,
} from '@/features/outlook-tools/lib/pending-reply-draft';
import { moveEmailToComposer } from '@/features/outlook-tools/lib/write-email';

async function insertOutlookReplyDraft(
  event: Office.MailboxEvent,
): Promise<void> {
  try {
    purgeExpiredReplyDraft();
    const account = outlookReplyAccount();
    const sourceKey = currentOutlookReplySourceKey();
    const reply = currentOutlookItem();
    if (!account || !sourceKey || reply?.mode !== 'compose') return;
    const pending = pendingReplyDraft(account, sourceKey);
    if (!pending) return;

    const { item } = reply;
    const { from, getComposeTypeAsync } = item;
    const getFrom = from?.getAsync;
    if (!getComposeTypeAsync || !getFrom) return;
    const { composeType } = await officeAsync<{
      composeType: Office.MailboxEnums.ComposeType;
    }>((callback) => getComposeTypeAsync.call(item, callback));
    if (composeType !== Office.MailboxEnums.ComposeType.Reply) return;
    const sender = await officeAsync<Office.EmailAddressDetails>((callback) =>
      getFrom.call(from, callback),
    );
    if (sender.emailAddress.trim().toLowerCase() !== account) return;

    await navigator.locks.request(OUTLOOK_REPLY_DRAFT_LOCK, async () => {
      if (
        currentOutlookMailboxItem() !== item ||
        outlookReplyAccount() !== account ||
        currentOutlookReplySourceKey() !== sourceKey
      )
        return;
      const draft = takePendingReplyDraft(sourceKey, pending.callId, account);
      if (draft)
        await moveEmailToComposer(reply, { body: draft.body }, draft.callId);
    });
  } catch {
    // The compose pane still offers manual insertion if Outlook cannot write.
  } finally {
    event.completed();
  }
}

Office.actions.associate(
  'insertOutlookReplyDraft',
  (event: Office.MailboxEvent) => {
    void insertOutlookReplyDraft(event);
  },
);

// Outlook on the web waits for the Office.js readiness handshake before it
// dispatches the compose event. Register the handler before starting it.
void Office.onReady();
