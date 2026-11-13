import { officeAsync } from '@/outlook/lib/outlook-tools/office-async';
import {
  listAttachments,
  type AttachmentInfo,
  type ComposeItem,
  type OutlookItem,
  type ReadItem,
} from '@/outlook/lib/outlook-tools/outlook-item';

interface EmailSnapshot {
  subject: string;
  from: string | null;
  to: string[];
  cc: string[];
  date: string | null;
  body: string;
  attachments: AttachmentInfo[];
}

type Address = Pick<Office.EmailAddressDetails, 'displayName' | 'emailAddress'>;

function formatAddress(address: Address): string {
  return address.displayName && address.displayName !== address.emailAddress
    ? `${address.displayName} <${address.emailAddress}>`
    : address.emailAddress;
}

function getAsyncValue<T>(
  getter:
    | { getAsync?: (callback: (result: Office.AsyncResult<T>) => void) => void }
    | undefined,
): Promise<T | null> {
  const getAsync = getter?.getAsync;
  if (typeof getAsync !== 'function') return Promise.resolve(null);
  return officeAsync<T>((callback) => getAsync.call(getter, callback));
}

function readBody(item: ReadItem | ComposeItem): Promise<string> {
  return officeAsync<string>((callback) =>
    item.body.getAsync(Office.CoercionType.Text, callback),
  );
}

async function snapshotReadItem(
  item: ReadItem,
): Promise<Omit<EmailSnapshot, 'attachments'>> {
  return {
    subject: typeof item.subject === 'string' ? item.subject : '',
    from: item.from ? formatAddress(item.from) : null,
    to: (item.to ?? []).map(formatAddress),
    cc: (item.cc ?? []).map(formatAddress),
    date: item.dateTimeCreated
      ? new Date(item.dateTimeCreated).toISOString()
      : null,
    body: await readBody(item),
  };
}

async function snapshotComposeItem(
  item: ComposeItem,
): Promise<Omit<EmailSnapshot, 'attachments'>> {
  const [subject, from, to, cc, body] = await Promise.all([
    getAsyncValue(item.subject),
    getAsyncValue(item.from),
    getAsyncValue(item.to),
    getAsyncValue(item.cc),
    readBody(item),
  ]);
  return {
    subject: subject ?? '',
    from: from ? formatAddress(from) : null,
    to: (to ?? []).map(formatAddress),
    cc: (cc ?? []).map(formatAddress),
    date: null,
    body,
  };
}

export async function readEmail(outlookItem: OutlookItem): Promise<string> {
  const [fields, attachments] = await Promise.all([
    outlookItem.mode === 'read'
      ? snapshotReadItem(outlookItem.item)
      : snapshotComposeItem(outlookItem.item),
    listAttachments(outlookItem),
  ]);
  const snapshot: EmailSnapshot = { ...fields, attachments };
  return JSON.stringify(snapshot);
}
