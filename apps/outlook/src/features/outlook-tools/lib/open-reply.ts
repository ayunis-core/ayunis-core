import {
  errorMessage,
  mailboxSupports,
  officeAsync,
} from '@/features/outlook-tools/lib/office-async';
import {
  currentOutlookItem,
  currentOutlookItemKey,
  type ReadItem,
} from '@/features/outlook-tools/lib/outlook-item';
import { draftBlockHtml } from '@/features/outlook-tools/lib/write-email';

export type OutlookReplyRecipients = 'all' | 'sender';

export type OutlookReplyOutcome =
  | { status: 'opened' }
  | {
      status: 'failed';
      failure: 'itemChanged' | 'officeFailed';
      message?: string;
    };

function showReplyForm(
  item: ReadItem,
  recipients: OutlookReplyRecipients,
  formData: Office.ReplyFormData,
): Promise<void> {
  const replyAsync =
    recipients === 'all'
      ? item.displayReplyAllFormAsync
      : item.displayReplyFormAsync;
  if (mailboxSupports('1.9') && typeof replyAsync === 'function') {
    return officeAsync<void>((callback) =>
      replyAsync.call(item, formData, callback),
    );
  }
  if (recipients === 'all') item.displayReplyAllForm(formData);
  else item.displayReplyForm(formData);
  return Promise.resolve();
}

/**
 * Opens Outlook's reply form for the mail being read with the draft as its
 * body. Outlook throws or fails the call for a body over 32 KB.
 */
export async function openOutlookReply(
  recipients: OutlookReplyRecipients,
  body: string,
  { expectedItemKey, draftId }: { expectedItemKey: string; draftId?: string },
): Promise<OutlookReplyOutcome> {
  const outlookItem = currentOutlookItem();
  if (
    outlookItem?.mode !== 'read' ||
    currentOutlookItemKey() !== expectedItemKey
  ) {
    return { status: 'failed', failure: 'itemChanged' };
  }
  try {
    await showReplyForm(outlookItem.item, recipients, {
      htmlBody: draftBlockHtml(body, draftId),
    });
    return { status: 'opened' };
  } catch (error) {
    return {
      status: 'failed',
      failure: 'officeFailed',
      message: errorMessage(error),
    };
  }
}
