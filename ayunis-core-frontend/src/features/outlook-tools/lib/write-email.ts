import { officeAsync } from '@/features/outlook-tools/lib/office-async';
import {
  currentOutlookMailboxItem,
  type ComposeItem,
  type OutlookItem,
} from '@/features/outlook-tools/lib/outlook-item';

export type OutlookWriteAction = 'inserted' | 'replaced' | 'saved';

export class NothingToSaveError extends Error {}
export class NoComposeItemError extends Error {}
export class ItemChangedError extends Error {}

/**
 * Writing takes several Office calls; the user may open another mail in a
 * pinned pane meanwhile, and the draft must not follow them there.
 */
function ensureStillOpen(item: ComposeItem): void {
  if (currentOutlookMailboxItem() !== item) throw new ItemChangedError();
}

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

const bodyOptions = (
  coercionType: Office.CoercionType,
): { coercionType: Office.CoercionType } => ({ coercionType });

/**
 * Office.js returns no handle to an insertion, so the draft carries an id in
 * the body: a revision finds it there and replaces only it, leaving the
 * user's signature, the quoted mail and anything they typed around it alone.
 * Outlook keeps element ids in the compose body; its own signature and reply
 * header rely on them. Each insertion gets its own id, remembered for the
 * compose item it went into, because a quoted earlier mail may carry the
 * block of its own draft. After a pane reload a revision lands on top again.
 */
const draftBlockIds = new WeakMap<ComposeItem, string>();

// A stable tool call ID lets a fresh pane recognize a draft already inserted
// into this reply, including a draft the user has since edited.
function draftBlockId(callId: string | undefined): string | undefined {
  if (!callId) return undefined;
  const encoded = Array.from(new TextEncoder().encode(callId), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `ayunis-draft-${encoded}`;
}

function findDraftBlock(bodyHtml: string, blockId: string) {
  return new RegExp(`<div\\b[^>]*\\sid="${blockId}"[^>]*>`, 'i').exec(bodyHtml);
}

function quotedThreadStart(bodyHtml: string): number {
  const replyHeader = /<div\b[^>]*\bid="(?:appendonsend|divRplyFwdMsg)"/i;
  return replyHeader.exec(bodyHtml)?.index ?? bodyHtml.length;
}

/**
 * The body with the draft block's content replaced, or null when it has
 * none. Office.js can only set the whole body, so everything outside the
 * block goes back exactly as Outlook returned it: parsing and serializing
 * the body would normalize Outlook's own markup (MSO comments, `o:p`).
 * Outlook may wrap edits to the draft in divs, so the block ends at the
 * `</div>` that balances its opening tag.
 */
function replaceDraftBlock(
  bodyHtml: string,
  blockId: string,
  html: string,
  nextBlockId = blockId,
): string | null {
  const open = findDraftBlock(bodyHtml, blockId);
  if (!open) return null;
  const contentStart = open.index + open[0].length;
  const tags = /<(\/?)div\b[^>]*>/gi;
  tags.lastIndex = contentStart;
  let depth = 1;
  for (let tag = tags.exec(bodyHtml); tag; tag = tags.exec(bodyHtml)) {
    depth += tag[1] ? -1 : 1;
    if (depth === 0) {
      const opening = open[0].replace(
        new RegExp(`(\\sid=")${blockId}"`, 'i'),
        `$1${nextBlockId}"`,
      );
      return (
        bodyHtml.slice(0, open.index) +
        opening +
        html +
        bodyHtml.slice(tag.index)
      );
    }
  }
  return null;
}

async function prependDraftBlock(
  item: ComposeItem,
  html: string,
  blockId = `ayunis-draft-${crypto.randomUUID()}`,
): Promise<'inserted'> {
  ensureStillOpen(item);
  await officeAsync<void>((callback) =>
    item.body.prependAsync(
      `<div id="${blockId}">${html}</div>`,
      bodyOptions(Office.CoercionType.Html),
      callback,
    ),
  );
  draftBlockIds.set(item, blockId);
  return 'inserted';
}

async function prependTextDraft(
  item: ComposeItem,
  body: string,
  callId?: string,
): Promise<'inserted'> {
  const text = Office.CoercionType.Text;
  const draft = `${body}\n\n`;
  if (callId !== undefined) {
    const current = await officeAsync<string>((callback) =>
      item.body.getAsync(text, callback),
    );
    if (
      current.replace(/\r\n/g, '\n').startsWith(draft.replace(/\r\n/g, '\n'))
    ) {
      ensureStillOpen(item);
      return 'inserted';
    }
  }
  ensureStillOpen(item);
  await officeAsync<void>((callback) =>
    item.body.prependAsync(draft, bodyOptions(text), callback),
  );
  return 'inserted';
}

async function writeDraft(
  item: ComposeItem,
  body: string,
  callId?: string,
): Promise<'inserted' | 'replaced'> {
  const type = await officeAsync<Office.CoercionType>((callback) =>
    item.body.getTypeAsync(callback),
  );
  const html = Office.CoercionType.Html;
  if (type !== html) return prependTextDraft(item, body, callId);

  const previousBlockId = draftBlockIds.get(item);
  const nextBlockId = draftBlockId(callId);
  const escapedBody = toHtml(body);
  if (!previousBlockId && !nextBlockId)
    return prependDraftBlock(item, escapedBody);

  const current = await officeAsync<string>((callback) =>
    item.body.getAsync(html, callback),
  );
  ensureStillOpen(item);
  if (nextBlockId) {
    const existing = findDraftBlock(current, nextBlockId);
    if (existing && existing.index < quotedThreadStart(current)) {
      draftBlockIds.set(item, nextBlockId);
      return 'inserted';
    }
  }
  const revised = previousBlockId
    ? replaceDraftBlock(current, previousBlockId, escapedBody, nextBlockId)
    : null;
  if (revised === null)
    return prependDraftBlock(item, escapedBody, nextBlockId);
  await officeAsync<void>((callback) =>
    item.body.setAsync(revised, bodyOptions(html), callback),
  );
  if (nextBlockId) draftBlockIds.set(item, nextBlockId);
  return 'replaced';
}

async function writeDraftAndSubject(
  item: ComposeItem,
  body: string,
  subject: string,
  callId?: string,
): Promise<OutlookWriteAction> {
  const action = await writeDraft(item, body, callId);
  // The draft is written; a mail opened since must not get its subject.
  if (subject !== '' && currentOutlookMailboxItem() === item) {
    await officeAsync<void>((callback) =>
      item.subject.setAsync(subject, callback),
    );
  }
  return action;
}

export async function draftEmail(
  outlookItem: OutlookItem,
  params: Record<string, unknown>,
  callId?: string,
): Promise<OutlookWriteAction> {
  if (outlookItem.mode === 'read') throw new NoComposeItemError();
  return writeDraftAndSubject(
    outlookItem.item,
    textParam(params.body),
    textParam(params.subject),
    callId,
  );
}

export async function moveEmailToComposer(
  outlookItem: OutlookItem,
  params: Record<string, unknown>,
  callId?: string,
): Promise<OutlookWriteAction> {
  if (outlookItem.mode === 'read') throw new NoComposeItemError();
  return writeDraft(outlookItem.item, textParam(params.body), callId);
}

export async function saveEmailToDraft(
  outlookItem: OutlookItem,
): Promise<OutlookWriteAction> {
  if (outlookItem.mode === 'read') throw new NothingToSaveError();
  const { item } = outlookItem;
  await officeAsync<string>((callback) => item.saveAsync(callback));
  return 'saved';
}
