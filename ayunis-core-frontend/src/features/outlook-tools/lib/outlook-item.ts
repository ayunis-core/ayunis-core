import {
  mailboxSupports,
  officeAsync,
} from '@/features/outlook-tools/lib/office-async';

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
  itemId?: string;
  internetMessageId?: string;
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
}

interface AsyncGetter<T> {
  getAsync?: (callback: Callback<T>) => void;
}

type BodyOptions = { coercionType: Office.CoercionType };

export interface ComposeItem extends AttachmentContentSource {
  itemId?: string;
  inReplyTo?: string | null;
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
    getTypeAsync: (callback: Callback<Office.CoercionType>) => void;
    setAsync: (
      data: string,
      options: BodyOptions,
      callback: Callback<void>,
    ) => void;
    prependAsync: (
      data: string,
      options: BodyOptions,
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

export function currentOutlookMailboxItem(): unknown {
  try {
    return Office.context.mailbox.item;
  } catch {
    return undefined;
  }
}

export function currentOutlookItem(): OutlookItem | undefined {
  const item = currentOutlookMailboxItem();
  if (typeof item !== 'object' || item === null) return undefined;
  if (isReadItem(item)) return { mode: 'read', item };
  if (isComposeItem(item)) return { mode: 'compose', item };
  return undefined;
}

/**
 * Identifies the mail the pane is on, so a run started on one mail does not
 * act on another after the user switched mails in a pinned pane. A mail being
 * composed has no id before it is saved, so two unsaved drafts share a key.
 */
export function currentOutlookItemKey(): string | null {
  const outlookItem = currentOutlookItem();
  if (!outlookItem) return null;
  if (outlookItem.mode === 'read' && outlookItem.item.internetMessageId) {
    return internetMessageKey(outlookItem.item.internetMessageId);
  }
  return `${outlookItem.mode}:${outlookItem.item.itemId ?? ''}`;
}

function internetMessageKey(id: string): string {
  return `read:internet:${id}`;
}

export function currentOutlookLegacyReadKey(): string | null {
  const outlookItem = currentOutlookItem();
  return outlookItem?.mode === 'read' && outlookItem.item.itemId
    ? `read:${outlookItem.item.itemId}`
    : null;
}

/** The original message of the reply that Outlook is currently editing. */
export function currentOutlookReplySourceKey(): string | null {
  const outlookItem = currentOutlookItem();
  return outlookItem?.mode === 'compose' && outlookItem.item.inReplyTo
    ? internetMessageKey(outlookItem.item.inReplyTo)
    : null;
}

const itemChanges = new EventTarget();

export function notifyOutlookItemChanged(): void {
  itemChanges.dispatchEvent(new Event('itemChanged'));
}

export function subscribeToOutlookItem(listener: () => void): () => void {
  itemChanges.addEventListener('itemChanged', listener);
  return () => itemChanges.removeEventListener('itemChanged', listener);
}

/** Whether the mail a key identifies was being read, not written. */
export function isReadItemKey(itemKey: string | null): boolean {
  return itemKey?.startsWith('read:') ?? false;
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
