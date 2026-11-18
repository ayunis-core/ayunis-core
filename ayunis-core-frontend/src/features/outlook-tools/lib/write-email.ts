import {
  mailboxSupports,
  officeAsync,
} from '@/features/outlook-tools/lib/office-async';
import {
  currentOutlookItemKey,
  type ComposeItem,
  type OutlookItem,
  type ReadItem,
} from '@/features/outlook-tools/lib/outlook-item';

export type OutlookWriteAction =
  'inserted' | 'replaced' | 'replyOpened' | 'saved';

export class NothingToSaveError extends Error {}
export class ItemChangedError extends Error {}

/**
 * Writing takes several Office calls; the user may open another mail in a
 * pinned pane meanwhile, and the draft must not follow them there.
 */
function ensureStillOpen(itemKey: string | null): void {
  if (currentOutlookItemKey() !== itemKey) throw new ItemChangedError();
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

/**
 * Replies opened from the read view become mails being written, items the
 * pane only sees afterwards. Each takes its draft's id from here once a
 * revision finds that block in its body.
 * ponytail: ids of replies never revised stay for the page's lifetime;
 * a few strings per Insert.
 */
const openedReplyBlockIds = new Set<string>();

function draftBlock(html: string): { blockId: string; blockHtml: string } {
  const blockId = `ayunis-draft-${crypto.randomUUID()}`;
  return { blockId, blockHtml: `<div id="${blockId}">${html}</div>` };
}

async function openReply(item: ReadItem, body: string): Promise<'replyOpened'> {
  const { blockId, blockHtml } = draftBlock(toHtml(body));
  const formData = { htmlBody: blockHtml };
  const replyAsync = item.displayReplyFormAsync;
  if (mailboxSupports('1.9') && typeof replyAsync === 'function') {
    await officeAsync<void>((callback) =>
      replyAsync.call(item, formData, callback),
    );
  } else {
    item.displayReplyForm(formData);
  }
  openedReplyBlockIds.add(blockId);
  return 'replyOpened';
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
  before = bodyHtml.length,
): string | null {
  const opening = new RegExp(`<div\\b[^>]*\\bid="${blockId}"[^>]*>`, 'i');
  const open = opening.exec(bodyHtml);
  if (!open || open.index >= before) return null;
  const contentStart = open.index + open[0].length;
  const tags = /<(\/?)div\b[^>]*>/gi;
  tags.lastIndex = contentStart;
  let depth = 1;
  for (let tag = tags.exec(bodyHtml); tag; tag = tags.exec(bodyHtml)) {
    depth += tag[1] ? -1 : 1;
    if (depth === 0) {
      return bodyHtml.slice(0, contentStart) + html + bodyHtml.slice(tag.index);
    }
  }
  return null;
}

/**
 * Where a reply's quoted thread starts: Outlook's reply header. A reply's
 * own draft is above it; a block below it is a quoted copy of an earlier
 * mail's draft, which may carry an id this pane is still waiting to see.
 * ponytail: the ids are Outlook on the web's (and the new Outlook's); in a
 * client without them the whole body counts as the reply's own.
 */
function quotedThreadStart(bodyHtml: string): number {
  const header = /<div\b[^>]*\bid="(?:appendonsend|divRplyFwdMsg)"/i;
  return header.exec(bodyHtml)?.index ?? bodyHtml.length;
}

function reviseFirstFound(
  bodyHtml: string,
  blockIds: string[],
  html: string,
  before: number,
): { blockId: string; revised: string } | null {
  for (const blockId of blockIds) {
    const revised = replaceDraftBlock(bodyHtml, blockId, html, before);
    if (revised !== null) return { blockId, revised };
  }
  return null;
}

async function prependDraftBlock(
  item: ComposeItem,
  html: string,
  itemKey: string | null,
): Promise<'inserted'> {
  ensureStillOpen(itemKey);
  const { blockId, blockHtml } = draftBlock(html);
  await officeAsync<void>((callback) =>
    item.body.prependAsync(
      blockHtml,
      bodyOptions(Office.CoercionType.Html),
      callback,
    ),
  );
  draftBlockIds.set(item, blockId);
  return 'inserted';
}

async function writeDraft(
  item: ComposeItem,
  body: string,
): Promise<'inserted' | 'replaced'> {
  const itemKey = currentOutlookItemKey();
  const type = await officeAsync<Office.CoercionType>((callback) =>
    item.body.getTypeAsync(callback),
  );
  const html = Office.CoercionType.Html;
  // A plain-text mail cannot carry the marker, so a revision lands on top.
  if (type !== html) {
    ensureStillOpen(itemKey);
    const text = Office.CoercionType.Text;
    await officeAsync<void>((callback) =>
      item.body.prependAsync(`${body}\n\n`, bodyOptions(text), callback),
    );
    return 'inserted';
  }
  const ownBlockId = draftBlockIds.get(item);
  // Newest first: a reply can quote an earlier reply's unclaimed block.
  const blockIds =
    ownBlockId === undefined
      ? [...openedReplyBlockIds].reverse()
      : [ownBlockId];
  if (blockIds.length === 0) {
    return prependDraftBlock(item, toHtml(body), itemKey);
  }
  const current = await officeAsync<string>((callback) =>
    item.body.getAsync(html, callback),
  );
  // An opened reply's block is only taken from above the quoted thread; a
  // block this pane wrote into the mail itself cannot be a quoted copy.
  const before =
    ownBlockId === undefined ? quotedThreadStart(current) : current.length;
  const found = reviseFirstFound(current, blockIds, toHtml(body), before);
  if (!found) return prependDraftBlock(item, toHtml(body), itemKey);
  ensureStillOpen(itemKey);
  await officeAsync<void>((callback) =>
    item.body.setAsync(found.revised, bodyOptions(html), callback),
  );
  // An opened reply's block is only taken by the mail it was written into;
  // a refused or failed write leaves it for the reply's next revision.
  if (ownBlockId === undefined) {
    draftBlockIds.set(item, found.blockId);
    openedReplyBlockIds.delete(found.blockId);
  }
  return 'replaced';
}

async function writeDraftAndSubject(
  item: ComposeItem,
  body: string,
  subject: string,
): Promise<OutlookWriteAction> {
  const itemKey = currentOutlookItemKey();
  const action = await writeDraft(item, body);
  // The draft is written; a mail opened since must not get its subject.
  if (subject !== '' && currentOutlookItemKey() === itemKey) {
    await officeAsync<void>((callback) =>
      item.subject.setAsync(subject, callback),
    );
  }
  return action;
}

export function draftEmail(
  outlookItem: OutlookItem,
  params: Record<string, unknown>,
): Promise<OutlookWriteAction> {
  const body = textParam(params.body);
  return outlookItem.mode === 'read'
    ? openReply(outlookItem.item, body)
    : writeDraftAndSubject(outlookItem.item, body, textParam(params.subject));
}

export function moveEmailToComposer(
  outlookItem: OutlookItem,
  params: Record<string, unknown>,
): Promise<OutlookWriteAction> {
  const body = textParam(params.body);
  return outlookItem.mode === 'read'
    ? openReply(outlookItem.item, body)
    : writeDraft(outlookItem.item, body);
}

export async function saveEmailToDraft(
  outlookItem: OutlookItem,
): Promise<OutlookWriteAction> {
  if (outlookItem.mode === 'read') throw new NothingToSaveError();
  const { item } = outlookItem;
  await officeAsync<string>((callback) => item.saveAsync(callback));
  return 'saved';
}
