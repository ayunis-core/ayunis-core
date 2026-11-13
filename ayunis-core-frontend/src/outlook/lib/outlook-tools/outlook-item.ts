import {
  mailboxSupports,
  officeAsync,
} from '@/outlook/lib/outlook-tools/office-async';

type Callback<T> = (result: Office.AsyncResult<T>) => void;

interface AttachmentContentSource {
  getAttachmentContentAsync?: (
    attachmentId: string,
    callback: Callback<Office.AttachmentContent>,
  ) => void;
}

// Office types `mailbox.item` as the intersection of every item kind, so the
// tools describe only what they use and feature-detect it at runtime.
export interface ReadItem extends AttachmentContentSource {
  subject?: unknown;
  from?: Office.EmailAddressDetails;
  to?: Office.EmailAddressDetails[];
  cc?: Office.EmailAddressDetails[];
  dateTimeCreated?: Date;
  // Office marks contentType deprecated but still returns it; it is the only
  // type hint read mode offers besides the file name.
  attachments?: (Omit<Office.AttachmentDetails, 'contentType'> & {
    contentType?: string;
  })[];
  body: {
    getAsync: (
      coercion: Office.CoercionType,
      callback: Callback<string>,
    ) => void;
  };
  displayReplyForm: (formData: Office.ReplyFormData) => void;
  displayReplyFormAsync?: (
    formData: Office.ReplyFormData,
    callback: Callback<void>,
  ) => void;
}

interface AsyncGetter<T> {
  getAsync?: (callback: Callback<T>) => void;
}

type TextOptions = { coercionType: Office.CoercionType };

export interface ComposeItem extends AttachmentContentSource {
  subject: AsyncGetter<string> & {
    setAsync: (subject: string, callback: Callback<void>) => void;
  };
  from?: AsyncGetter<Office.EmailAddressDetails>;
  to?: AsyncGetter<Office.EmailAddressDetails[]>;
  cc?: AsyncGetter<Office.EmailAddressDetails[]>;
  body: {
    getAsync: (
      coercion: Office.CoercionType,
      callback: Callback<string>,
    ) => void;
    setAsync: (
      text: string,
      options: TextOptions,
      callback: Callback<void>,
    ) => void;
    setSelectedDataAsync: (
      text: string,
      options: TextOptions,
      callback: Callback<void>,
    ) => void;
  };
  getAttachmentsAsync?: (
    callback: Callback<Office.AttachmentDetailsCompose[]>,
  ) => void;
  saveAsync: (callback: Callback<string>) => void;
}

export type OutlookItem =
  { mode: 'read'; item: ReadItem } | { mode: 'compose'; item: ComposeItem };

export interface AttachmentInfo {
  id: string;
  name: string;
  contentType: string | null;
  size: number;
  isInline: boolean;
}

function isReadItem(item: object): item is ReadItem {
  return (
    'displayReplyForm' in item && typeof item.displayReplyForm === 'function'
  );
}

function isComposeItem(item: object): item is ComposeItem {
  return !isReadItem(item);
}

function mailboxItem(): unknown {
  try {
    return Office.context.mailbox.item;
  } catch {
    return undefined;
  }
}

export function currentOutlookItem(): OutlookItem | undefined {
  const item = mailboxItem();
  if (typeof item !== 'object' || item === null) return undefined;
  if (isReadItem(item)) return { mode: 'read', item };
  if (isComposeItem(item)) return { mode: 'compose', item };
  return undefined;
}

export async function listAttachments(
  outlookItem: OutlookItem,
): Promise<AttachmentInfo[]> {
  if (outlookItem.mode === 'read') {
    return (outlookItem.item.attachments ?? []).map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      contentType: attachment.contentType ?? null,
      size: attachment.size,
      isInline: attachment.isInline,
    }));
  }
  const { getAttachmentsAsync } = outlookItem.item;
  if (!mailboxSupports('1.8') || typeof getAttachmentsAsync !== 'function') {
    return [];
  }
  const attachments = await officeAsync<Office.AttachmentDetailsCompose[]>(
    (callback) => getAttachmentsAsync.call(outlookItem.item, callback),
  );
  return attachments.map((attachment) => ({
    id: attachment.id,
    name: attachment.name,
    contentType: null,
    size: attachment.size,
    isInline: attachment.isInline,
  }));
}
