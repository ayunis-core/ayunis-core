import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeOutlookTool, OUTLOOK_TOOL } from '@/features/outlook-tools';

type Callback = (result: {
  status: string;
  value?: unknown;
  error?: { message: string };
}) => void;

const succeed =
  (value?: unknown) =>
  (...args: unknown[]) => {
    const callback = args[args.length - 1] as Callback;
    callback({ status: 'succeeded', value });
  };

const fail =
  (message: string) =>
  (...args: unknown[]) => {
    const callback = args[args.length - 1] as Callback;
    callback({ status: 'failed', error: { message } });
  };

const alice = { displayName: 'Alice', emailAddress: 'alice@example.org' };
const bob = { displayName: 'Bob', emailAddress: 'bob@example.org' };

function base64(text: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)));
}

function stubOffice(item: object | undefined, mailboxVersion = '1.9') {
  vi.stubGlobal('Office', {
    AsyncResultStatus: { Succeeded: 'succeeded', Failed: 'failed' },
    CoercionType: { Text: 'text', Html: 'html' },
    context: {
      requirements: {
        isSetSupported: (_set: string, version: string) =>
          Number(version.split('.')[1]) <= Number(mailboxVersion.split('.')[1]),
      },
      mailbox: { item },
    },
  });
}

function readItem(overrides: object = {}) {
  return {
    subject: 'Budget',
    from: alice,
    to: [bob],
    cc: [],
    dateTimeCreated: new Date('2026-11-01T10:00:00Z'),
    attachments: [
      {
        id: 'att-1',
        name: 'Notes.txt',
        contentType: 'text/plain',
        size: 10,
        isInline: false,
      },
      {
        id: 'att-2',
        name: 'report.pdf',
        contentType: 'application/pdf',
        size: 20,
        isInline: false,
      },
    ],
    body: { getAsync: vi.fn(succeed('Hello Bob')) },
    displayReplyForm: vi.fn(),
    displayReplyFormAsync: vi.fn(succeed()),
    getAttachmentContentAsync: vi.fn((id: string, callback: Callback) =>
      callback({
        status: 'succeeded',
        value: {
          format: 'base64',
          content: id === 'att-1' ? base64('Grüße aus Köln') : base64('%PDF'),
        },
      }),
    ),
    ...overrides,
  };
}

const REPLY_HTML =
  '<html><head></head><body><div>Hi</div><div id="Signature">Bob</div><div id="divRplyFwdMsg">Quoted mail</div></body></html>';

function composeItem({ html = REPLY_HTML, bodyType = 'html' } = {}) {
  return {
    subject: { getAsync: vi.fn(succeed('Draft')), setAsync: vi.fn(succeed()) },
    from: { getAsync: vi.fn(succeed(alice)) },
    to: { getAsync: vi.fn(succeed([bob])) },
    cc: { getAsync: vi.fn(succeed([])) },
    body: {
      getAsync: vi.fn((coercion: string, callback: Callback) =>
        callback({
          status: 'succeeded',
          value: coercion === 'html' ? html : 'Hi',
        }),
      ),
      getTypeAsync: vi.fn(succeed(bodyType)),
      setAsync: vi.fn(succeed()),
      prependAsync: vi.fn(succeed()),
    },
    getAttachmentsAsync: vi.fn(succeed([])),
    saveAsync: vi.fn(succeed('item-id')),
  };
}

function parse(outcome: { status: string; result?: string }) {
  expect(outcome.status).toBe('result');
  return JSON.parse(outcome.result ?? '') as Record<string, unknown>;
}

afterEach(() => vi.unstubAllGlobals());

describe('outlook__read_email', () => {
  it('reads properties of a received mail', async () => {
    stubOffice(readItem());
    const email = parse(await executeOutlookTool(OUTLOOK_TOOL.readEmail, {}));
    expect(email).toEqual({
      subject: 'Budget',
      from: 'Alice <alice@example.org>',
      to: ['Bob <bob@example.org>'],
      cc: [],
      date: '2026-11-01T10:00:00.000Z',
      body: 'Hello Bob',
      attachments: [
        expect.objectContaining({ id: 'att-1', name: 'Notes.txt' }),
        expect.objectContaining({ id: 'att-2', name: 'report.pdf' }),
      ],
    });
  });

  it('reads a mail being composed through the async getters', async () => {
    stubOffice(composeItem());
    const email = parse(await executeOutlookTool(OUTLOOK_TOOL.readEmail, {}));
    expect(email).toEqual({
      subject: 'Draft',
      from: 'Alice <alice@example.org>',
      to: ['Bob <bob@example.org>'],
      cc: [],
      date: null,
      body: 'Hi',
      attachments: [],
    });
  });

  it('reports a failed Office call as an error result', async () => {
    stubOffice(readItem({ body: { getAsync: fail('Access denied') } }));
    const email = parse(await executeOutlookTool(OUTLOOK_TOOL.readEmail, {}));
    expect(email).toEqual({ error: 'Access denied' });
  });

  it('reports that no email is open', async () => {
    stubOffice(undefined);
    const email = parse(await executeOutlookTool(OUTLOOK_TOOL.readEmail, {}));
    expect(email).toEqual({ error: 'no email is open' });
  });
});

describe('outlook__read_attachment', () => {
  it('decodes text attachments as UTF-8, found by name case-insensitively', async () => {
    stubOffice(readItem());
    const outcome = await executeOutlookTool(OUTLOOK_TOOL.readAttachment, {
      name: 'notes.TXT',
    });
    expect(outcome).toEqual({ status: 'result', result: 'Grüße aus Köln' });
  });

  it('refuses below Mailbox 1.8', async () => {
    stubOffice(readItem(), '1.7');
    const outcome = await executeOutlookTool(OUTLOOK_TOOL.readAttachment, {
      attachmentId: 'att-1',
    });
    expect(parse(outcome)).toEqual({ error: 'attachments need Mailbox 1.8' });
  });

  it('reports an unknown attachment', async () => {
    stubOffice(readItem());
    const outcome = await executeOutlookTool(OUTLOOK_TOOL.readAttachment, {
      attachmentId: 'missing',
    });
    expect(parse(outcome)).toEqual({ error: 'attachment not found' });
  });

  it('refuses binary attachments without an extractor', async () => {
    stubOffice(readItem());
    const outcome = await executeOutlookTool(OUTLOOK_TOOL.readAttachment, {
      attachmentId: 'att-2',
    });
    expect(parse(outcome)).toEqual({
      error: 'this attachment type cannot be read',
    });
  });

  it('hands binary attachments to the extractor', async () => {
    stubOffice(readItem());
    const extractAttachmentText = vi.fn().mockResolvedValue('PDF text');
    const outcome = await executeOutlookTool(
      OUTLOOK_TOOL.readAttachment,
      { attachmentId: 'att-2' },
      { extractAttachmentText },
    );
    expect(outcome).toEqual({ status: 'result', result: 'PDF text' });
    expect(extractAttachmentText).toHaveBeenCalledWith({
      name: 'report.pdf',
      contentType: 'application/pdf',
      base64: base64('%PDF'),
      // Identifies the attachment, so a same-named one of another mail is
      // uploaded rather than read from the first.
      key: expect.stringContaining('att-2'),
    });
  });
});

const DRAFT_BLOCK = /^<div id="(ayunis-draft-[0-9a-f-]+)">(.*)<\/div>$/;

/** The id and HTML of the draft block a compose write prepended. */
function prependedDraft(item: ReturnType<typeof composeItem>) {
  const html = item.body.prependAsync.mock.calls.at(-1)?.[0] as string;
  const match = DRAFT_BLOCK.exec(html);
  expect(match).not.toBeNull();
  return { id: match?.[1] ?? '', html };
}

/** The HTML the reply form was opened with. */
function replyHtml(item: ReturnType<typeof readItem>): string {
  const [formData] = item.displayReplyFormAsync.mock.calls.at(-1) as [
    { htmlBody: string },
  ];
  return formData.htmlBody;
}

/** The HTML a compose write left in the body, as Outlook would return it. */
function writtenHtml(item: ReturnType<typeof composeItem>): Document {
  const html = item.body.setAsync.mock.calls[0]?.[0] as string;
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('outlook__draft_email', () => {
  it('puts the first draft above the signature and quoted mail, keeping both', async () => {
    const item = composeItem();
    stubOffice(item);
    const outcome = await executeOutlookTool(OUTLOOK_TOOL.draftEmail, {
      subject: 'Re: Budget',
      body: 'Dear Bob',
    });
    expect(outcome).toEqual({ status: 'done', action: 'inserted' });
    expect(item.body.prependAsync).toHaveBeenCalledWith(
      expect.stringMatching(DRAFT_BLOCK),
      { coercionType: 'html' },
      expect.any(Function),
    );
    expect(prependedDraft(item).html).toContain('>Dear Bob</div>');
    expect(item.body.setAsync).not.toHaveBeenCalled();
    expect(item.subject.setAsync).toHaveBeenCalledWith(
      'Re: Budget',
      expect.any(Function),
    );
  });

  it('replaces only the previous draft from Ayunis with a revision', async () => {
    const item = composeItem();
    stubOffice(item);
    await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'Old draft' });
    const { id } = prependedDraft(item);
    item.body.getAsync = vi.fn((...args: unknown[]) =>
      (args[1] as Callback)({
        status: 'succeeded',
        value: `<html><head><style>p{}</style></head><body><div id="${id}">Old <b>draft</b></div><div>My own note</div><div id="Signature">Bob</div><div id="divRplyFwdMsg">Quoted mail</div></body></html>`,
      }),
    );

    const outcome = await executeOutlookTool(OUTLOOK_TOOL.draftEmail, {
      body: 'New draft\nBye',
    });

    expect(outcome).toEqual({ status: 'done', action: 'replaced' });
    expect(item.body.prependAsync).toHaveBeenCalledOnce();
    const written = writtenHtml(item);
    expect(written.getElementById(id)?.innerHTML).toBe('New draft<br>Bye');
    expect(written.body.textContent).not.toContain('Old');
    expect(written.body.textContent).toContain('My own note');
    expect(written.getElementById('Signature')?.textContent).toBe('Bob');
    expect(written.getElementById('divRplyFwdMsg')?.textContent).toBe(
      'Quoted mail',
    );
    expect(written.head.innerHTML).toContain('<style>');
  });

  it('changes nothing outside its own block when it revises a draft', async () => {
    const item = composeItem();
    stubOffice(item);
    await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'Old draft' });
    const { id } = prependedDraft(item);
    const outside = (draft: string) =>
      `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><!--[if mso]><style>p.MsoNormal{margin:0}</style><![endif]--></head><body><div id="${id}">${draft}</div><p class=MsoNormal>Regards<o:p></o:p></p><div id="Signature"><div>Bob</div></div><div id="divRplyFwdMsg"><div>Quoted</div></div></body></html>`;
    item.body.getAsync = vi.fn((...args: unknown[]) =>
      (args[1] as Callback)({
        status: 'succeeded',
        // Outlook wrapped the user's edits to the draft in divs of its own.
        value: outside('<div>Old</div><div>draft</div>'),
      }),
    );

    await executeOutlookTool(OUTLOOK_TOOL.draftEmail, {
      body: 'New draft',
    });

    expect(item.body.setAsync.mock.calls[0]?.[0]).toBe(outside('New draft'));
  });

  it('refuses to write into a mail opened after a run that started with no mail open', async () => {
    const item = composeItem();
    stubOffice(item);
    const outcome = await executeOutlookTool(
      OUTLOOK_TOOL.draftEmail,
      { body: 'Hi' },
      { expectedItemKey: null },
    );
    expect(outcome).toEqual({ status: 'failed', failure: 'itemChanged' });
    expect(item.body.prependAsync).not.toHaveBeenCalled();
  });

  it('leaves a draft quoted from an earlier Ayunis-drafted mail untouched', async () => {
    const item = composeItem({
      html: '<html><body><div id="Signature">Bob</div><div id="divRplyFwdMsg"><div id="ayunis-draft-0b6f3c1e-2f4a-4c3e-9a51-7d0d2a1f9e10">Their earlier reply</div></div></body></html>',
    });
    stubOffice(item);

    const outcome = await executeOutlookTool(OUTLOOK_TOOL.draftEmail, {
      body: 'Dear Bob',
    });

    expect(outcome).toEqual({ status: 'done', action: 'inserted' });
    expect(prependedDraft(item).html).toContain('>Dear Bob</div>');
    expect(item.body.setAsync).not.toHaveBeenCalled();
  });

  it('does not write the draft once another mail opened while the body was read', async () => {
    const item = composeItem();
    const other = { ...composeItem(), itemId: 'other-draft' };
    item.body.getTypeAsync = vi.fn((...args: unknown[]) => {
      stubOffice(other);
      (args[0] as Callback)({ status: 'succeeded', value: 'html' });
    });
    stubOffice(item);

    const outcome = await executeOutlookTool(OUTLOOK_TOOL.draftEmail, {
      body: 'Dear Bob',
    });

    expect(outcome).toEqual({ status: 'failed', failure: 'itemChanged' });
    expect(item.body.prependAsync).not.toHaveBeenCalled();
    expect(other.body.prependAsync).not.toHaveBeenCalled();
  });

  it('does not set the subject on a mail opened after the draft was written', async () => {
    const item = composeItem();
    const other = { ...composeItem(), itemId: 'other-draft' };
    item.body.prependAsync = vi.fn((...args: unknown[]) => {
      stubOffice(other);
      (args[2] as Callback)({ status: 'succeeded' });
    });
    stubOffice(item);

    const outcome = await executeOutlookTool(OUTLOOK_TOOL.draftEmail, {
      subject: 'Re: Budget',
      body: 'Dear Bob',
    });

    expect(outcome).toEqual({ status: 'done', action: 'inserted' });
    expect(item.subject.setAsync).not.toHaveBeenCalled();
    expect(other.subject.setAsync).not.toHaveBeenCalled();
  });

  it('puts the draft at the top of a plain-text mail', async () => {
    const item = composeItem({ bodyType: 'text' });
    stubOffice(item);
    const outcome = await executeOutlookTool(OUTLOOK_TOOL.draftEmail, {
      body: 'Dear Bob',
    });
    expect(outcome).toEqual({ status: 'done', action: 'inserted' });
    expect(item.body.prependAsync).toHaveBeenCalledWith(
      'Dear Bob\n\n',
      { coercionType: 'text' },
      expect.any(Function),
    );
    expect(item.body.setAsync).not.toHaveBeenCalled();
  });

  it('opens a reply with escaped HTML for a received mail', async () => {
    const item = readItem();
    stubOffice(item);
    const outcome = await executeOutlookTool(OUTLOOK_TOOL.draftEmail, {
      body: 'A <b> & B\nBye',
    });
    expect(outcome).toEqual({ status: 'done', action: 'replyOpened' });
    expect(item.displayReplyFormAsync).toHaveBeenCalledWith(
      { htmlBody: expect.stringMatching(DRAFT_BLOCK) as string },
      expect.any(Function),
    );
    expect(replyHtml(item)).toContain('>A &lt;b&gt; &amp; B<br>Bye</div>');
  });

  it('replaces the draft it opened a reply with when the user revises it in that reply', async () => {
    const received = readItem();
    stubOffice(received);
    await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'First draft' });
    const opened = replyHtml(received);
    const reply = composeItem({
      html: `<html><body>${opened}<div id="Signature">Bob</div><div id="divRplyFwdMsg">Quoted mail</div></body></html>`,
    });
    stubOffice(reply);

    const outcome = await executeOutlookTool(OUTLOOK_TOOL.draftEmail, {
      body: 'Second draft',
    });

    expect(outcome).toEqual({ status: 'done', action: 'replaced' });
    expect(reply.body.prependAsync).not.toHaveBeenCalled();
    const written = writtenHtml(reply);
    expect(written.body.textContent).not.toContain('First draft');
    expect(written.body.textContent).toContain('Second draft');
    expect(written.getElementById('divRplyFwdMsg')?.textContent).toBe(
      'Quoted mail',
    );
  });

  it("keeps the opened reply's draft id while another mail being written is revised", async () => {
    const received = readItem();
    stubOffice(received);
    await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'Reply draft' });
    const opened = replyHtml(received);

    const other = composeItem();
    stubOffice(other);
    await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'Other draft' });
    const { html: otherBlock } = prependedDraft(other);
    other.body.getAsync = vi.fn((...args: unknown[]) =>
      (args[1] as Callback)({
        status: 'succeeded',
        value: `<html><body>${otherBlock}</body></html>`,
      }),
    );
    await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'Other v2' });

    const reply = composeItem({
      html: `<html><body>${opened}<div id="divRplyFwdMsg">Quoted mail</div></body></html>`,
    });
    stubOffice(reply);
    const outcome = await executeOutlookTool(OUTLOOK_TOOL.draftEmail, {
      body: 'Reply v2',
    });

    expect(outcome).toEqual({ status: 'done', action: 'replaced' });
    expect(reply.body.prependAsync).not.toHaveBeenCalled();
  });

  it('revises the draft of each reply opened with Insert in place, whichever was opened last', async () => {
    const first = readItem();
    stubOffice(first);
    await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'To Alice' });
    const firstOpened = replyHtml(first);
    const second = readItem({ itemId: 'mail-2' });
    stubOffice(second);
    await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'To Carol' });
    const secondOpened = replyHtml(second);

    for (const opened of [firstOpened, secondOpened]) {
      const reply = composeItem({
        html: `<html><body>${opened}</body></html>`,
      });
      stubOffice(reply);
      expect(
        await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'v2' }),
      ).toEqual({ status: 'done', action: 'replaced' });
      expect(reply.body.prependAsync).not.toHaveBeenCalled();
    }
  });

  it("revises a reply's own draft, not an earlier reply's draft it quotes", async () => {
    const first = readItem();
    stubOffice(first);
    await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'Earlier' });
    const quoted = replyHtml(first);
    const second = readItem({ itemId: 'mail-2' });
    stubOffice(second);
    await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'Mine' });
    const own = replyHtml(second);

    const reply = composeItem({
      html: `<html><body>${own}<div id="divRplyFwdMsg">${quoted}</div></body></html>`,
    });
    stubOffice(reply);
    await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'Mine v2' });

    const written = writtenHtml(reply);
    expect(written.getElementById('divRplyFwdMsg')?.textContent).toBe(
      'Earlier',
    );
    expect(written.body.textContent).toContain('Mine v2');
  });

  it("keeps the opened reply's draft id when its first revision is refused", async () => {
    const received = readItem();
    stubOffice(received);
    await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'Reply draft' });
    const opened = replyHtml(received);
    const reply = composeItem({ html: `<html><body>${opened}</body></html>` });
    const replyGetAsync = reply.body.getAsync;
    reply.body.getAsync = vi.fn((...args: unknown[]) => {
      stubOffice({ ...composeItem(), itemId: 'other-draft' });
      replyGetAsync(...(args as [string, Callback]));
    });
    stubOffice(reply);
    expect(
      await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'v2' }),
    ).toEqual({ status: 'failed', failure: 'itemChanged' });

    // Back on the reply, Outlook hands the pane a new item object for it.
    const returned = composeItem({
      html: `<html><body>${opened}</body></html>`,
    });
    stubOffice(returned);
    expect(
      await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'v2' }),
    ).toEqual({ status: 'done', action: 'replaced' });
    expect(returned.body.prependAsync).not.toHaveBeenCalled();
  });

  it('does not take over an earlier reply draft quoted in a mail being written', async () => {
    const received = readItem();
    stubOffice(received);
    await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'Sent draft' });
    const sent = replyHtml(received);
    const quoting = `<html><body><div>Hi</div><div id="appendonsend"></div><div id="divRplyFwdMsg">From: Alice</div><div>Thanks!</div><div>${sent}</div></body></html>`;
    const reply = composeItem({ html: quoting });
    stubOffice(reply);

    const outcome = await executeOutlookTool(OUTLOOK_TOOL.draftEmail, {
      body: 'New draft',
    });

    expect(outcome).toEqual({ status: 'done', action: 'inserted' });
    expect(reply.body.setAsync).not.toHaveBeenCalled();
  });

  it("does not hand the opened reply's draft id to a mail that does not contain it", async () => {
    const received = readItem();
    stubOffice(received);
    await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'Reply draft' });
    const opened = replyHtml(received);

    const fresh = composeItem();
    stubOffice(fresh);
    expect(
      await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'New mail' }),
    ).toEqual({ status: 'done', action: 'inserted' });

    const reply = composeItem({
      html: `<html><body>${opened}</body></html>`,
    });
    stubOffice(reply);
    expect(
      await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'Reply v2' }),
    ).toEqual({ status: 'done', action: 'replaced' });
  });

  it('falls back to the synchronous reply form below Mailbox 1.9', async () => {
    const item = readItem();
    stubOffice(item, '1.8');
    await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'Hi' });
    expect(item.displayReplyFormAsync).not.toHaveBeenCalled();
    expect(item.displayReplyForm).toHaveBeenCalledWith({
      htmlBody: expect.stringMatching(DRAFT_BLOCK) as string,
    });
  });

  it('reports a failed Office call with its message', async () => {
    const item = composeItem();
    item.body.prependAsync = vi.fn(fail('Item is read-only'));
    stubOffice(item);
    const outcome = await executeOutlookTool(OUTLOOK_TOOL.draftEmail, {
      body: 'Hi',
    });
    expect(outcome).toEqual({
      status: 'failed',
      failure: 'officeFailed',
      message: 'Item is read-only',
    });
  });

  it('fails without an open email', async () => {
    stubOffice(undefined);
    const outcome = await executeOutlookTool(OUTLOOK_TOOL.draftEmail, {
      body: 'Hi',
    });
    expect(outcome).toEqual({ status: 'failed', failure: 'noItem' });
  });
});

describe('outlook__move_email_to_composer', () => {
  it('writes the draft like draft_email, keeping the signature and quoted mail', async () => {
    const item = composeItem();
    stubOffice(item);
    const outcome = await executeOutlookTool(OUTLOOK_TOOL.moveEmailToComposer, {
      body: 'Full text',
    });
    expect(outcome).toEqual({ status: 'done', action: 'inserted' });
    expect(prependedDraft(item).html).toContain('>Full text</div>');
    expect(item.body.setAsync).not.toHaveBeenCalled();
  });
});

describe('outlook__save_email_to_draft', () => {
  it('saves a mail being composed', async () => {
    const item = composeItem();
    stubOffice(item);
    const outcome = await executeOutlookTool(OUTLOOK_TOOL.saveEmailToDraft, {});
    expect(outcome).toEqual({ status: 'done', action: 'saved' });
    expect(item.saveAsync).toHaveBeenCalled();
  });

  it('has nothing to save for a received mail', async () => {
    stubOffice(readItem());
    const outcome = await executeOutlookTool(OUTLOOK_TOOL.saveEmailToDraft, {});
    expect(outcome).toEqual({ status: 'failed', failure: 'nothingToSave' });
  });
});

describe('the mail a run started on', () => {
  it('refuses to read once a different mail is open', async () => {
    stubOffice(readItem({ itemId: 'mail-b' }));

    const outcome = await executeOutlookTool(
      OUTLOOK_TOOL.readEmail,
      {},
      { expectedItemKey: 'read:mail-a' },
    );

    expect(parse(outcome)).toEqual({
      error: 'the open email changed since this request started',
    });
  });

  it('refuses to write once a different mail is open', async () => {
    stubOffice({ ...composeItem(), itemId: 'mail-b' });

    const outcome = await executeOutlookTool(
      OUTLOOK_TOOL.draftEmail,
      { body: 'Hallo' },
      { expectedItemKey: 'compose:mail-a' },
    );

    expect(outcome).toEqual({ status: 'failed', failure: 'itemChanged' });
  });

  it('acts on the mail the run started on', async () => {
    stubOffice(readItem({ itemId: 'mail-a' }));

    const outcome = await executeOutlookTool(
      OUTLOOK_TOOL.readEmail,
      {},
      { expectedItemKey: 'read:mail-a' },
    );

    expect(parse(outcome).subject).toBe('Budget');
  });
});
