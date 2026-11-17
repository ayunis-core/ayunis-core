import {
  mailboxSupports,
  officeAsync,
} from '@/outlook/lib/outlook-tools/office-async';
import type {
  ComposeItem,
  OutlookItem,
  ReadItem,
} from '@/outlook/lib/outlook-tools/outlook-item';

export type OutlookWriteAction =
  'inserted' | 'replaced' | 'replyOpened' | 'saved';

export class NothingToSaveError extends Error {}

function textParam(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\r?\n/g, '<br>');
}

async function openReply(item: ReadItem, body: string): Promise<'replyOpened'> {
  const formData = { htmlBody: toHtml(body) };
  const replyAsync = item.displayReplyFormAsync;
  if (mailboxSupports('1.9') && typeof replyAsync === 'function') {
    await officeAsync<void>((callback) =>
      replyAsync.call(item, formData, callback),
    );
  } else {
    item.displayReplyForm(formData);
  }
  return 'replyOpened';
}

const textOptions = (): { coercionType: Office.CoercionType } => ({
  coercionType: Office.CoercionType.Text,
});

async function insertDraft(
  item: ComposeItem,
  body: string,
  subject: string,
): Promise<'inserted'> {
  await officeAsync<void>((callback) =>
    item.body.setSelectedDataAsync(body, textOptions(), callback),
  );
  if (subject !== '') {
    await officeAsync<void>((callback) =>
      item.subject.setAsync(subject, callback),
    );
  }
  return 'inserted';
}

export function draftEmail(
  outlookItem: OutlookItem,
  params: Record<string, unknown>,
): Promise<OutlookWriteAction> {
  const body = textParam(params.body);
  return outlookItem.mode === 'read'
    ? openReply(outlookItem.item, body)
    : insertDraft(outlookItem.item, body, textParam(params.subject));
}

export async function moveEmailToComposer(
  outlookItem: OutlookItem,
  params: Record<string, unknown>,
): Promise<OutlookWriteAction> {
  const body = textParam(params.body);
  if (outlookItem.mode === 'read') return openReply(outlookItem.item, body);
  const { item } = outlookItem;
  await officeAsync<void>((callback) =>
    item.body.setAsync(body, textOptions(), callback),
  );
  return 'replaced';
}

export async function saveEmailToDraft(
  outlookItem: OutlookItem,
): Promise<OutlookWriteAction> {
  if (outlookItem.mode === 'read') throw new NothingToSaveError();
  const { item } = outlookItem;
  await officeAsync<string>((callback) => item.saveAsync(callback));
  return 'saved';
}
