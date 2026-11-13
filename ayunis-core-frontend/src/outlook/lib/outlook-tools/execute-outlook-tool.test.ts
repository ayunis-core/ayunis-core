import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeOutlookTool, OUTLOOK_TOOL } from '@/outlook/lib/outlook-tools';

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
    CoercionType: { Text: 'text' },
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

function composeItem() {
  return {
    subject: { getAsync: vi.fn(succeed('Draft')), setAsync: vi.fn(succeed()) },
    from: { getAsync: vi.fn(succeed(alice)) },
    to: { getAsync: vi.fn(succeed([bob])) },
    cc: { getAsync: vi.fn(succeed([])) },
    body: {
      getAsync: vi.fn(succeed('Hi')),
      setAsync: vi.fn(succeed()),
      setSelectedDataAsync: vi.fn(succeed()),
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
    });
  });
});

describe('outlook__draft_email', () => {
  it('inserts the draft at the cursor of a mail being composed', async () => {
    const item = composeItem();
    stubOffice(item);
    const outcome = await executeOutlookTool(OUTLOOK_TOOL.draftEmail, {
      subject: 'Re: Budget',
      body: 'Dear Bob',
    });
    expect(outcome).toEqual({ status: 'done', action: 'inserted' });
    expect(item.body.setSelectedDataAsync).toHaveBeenCalledWith(
      'Dear Bob',
      { coercionType: 'text' },
      expect.any(Function),
    );
    expect(item.body.setAsync).not.toHaveBeenCalled();
    expect(item.subject.setAsync).toHaveBeenCalledWith(
      'Re: Budget',
      expect.any(Function),
    );
  });

  it('opens a reply with escaped HTML for a received mail', async () => {
    const item = readItem();
    stubOffice(item);
    const outcome = await executeOutlookTool(OUTLOOK_TOOL.draftEmail, {
      body: 'A <b> & B\nBye',
    });
    expect(outcome).toEqual({ status: 'done', action: 'replyOpened' });
    expect(item.displayReplyFormAsync).toHaveBeenCalledWith(
      { htmlBody: 'A &lt;b&gt; &amp; B<br>Bye' },
      expect.any(Function),
    );
  });

  it('falls back to the synchronous reply form below Mailbox 1.9', async () => {
    const item = readItem();
    stubOffice(item, '1.8');
    await executeOutlookTool(OUTLOOK_TOOL.draftEmail, { body: 'Hi' });
    expect(item.displayReplyFormAsync).not.toHaveBeenCalled();
    expect(item.displayReplyForm).toHaveBeenCalledWith({ htmlBody: 'Hi' });
  });

  it('reports a failed Office call with its message', async () => {
    const item = composeItem();
    item.body.setSelectedDataAsync = vi.fn(fail('Item is read-only'));
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
  it('replaces the whole body of a mail being composed', async () => {
    const item = composeItem();
    stubOffice(item);
    const outcome = await executeOutlookTool(OUTLOOK_TOOL.moveEmailToComposer, {
      body: 'Full text',
    });
    expect(outcome).toEqual({ status: 'done', action: 'replaced' });
    expect(item.body.setAsync).toHaveBeenCalledWith(
      'Full text',
      { coercionType: 'text' },
      expect.any(Function),
    );
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
