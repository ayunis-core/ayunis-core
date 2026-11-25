import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeOutlookTool } from './execute-outlook-tool';
import { openOutlookReply } from './open-reply';

function stubOffice(item: object, mailboxVersion: string) {
  vi.stubGlobal('Office', {
    AsyncResultStatus: { Succeeded: 'succeeded', Failed: 'failed' },
    CoercionType: { Text: 'text', Html: 'html' },
    context: {
      requirements: {
        isSetSupported: (_name: string, version: string) =>
          Number(version.split('.')[1]) <= Number(mailboxVersion.split('.')[1]),
      },
      mailbox: { item },
    },
  });
}

function readItem() {
  return {
    itemId: 'mail-1',
    internetMessageId: '<mail-1@example.org>',
    body: { getAsync: vi.fn() },
    displayReplyForm: vi.fn(),
    displayReplyAllForm: vi.fn(),
    displayReplyFormAsync: vi.fn(),
    displayReplyAllFormAsync: vi.fn(),
  };
}

const expectedItemKey = 'read:internet:<mail-1@example.org>';

afterEach(() => vi.unstubAllGlobals());

describe(openOutlookReply.name, () => {
  it.each([
    ['all', 'displayReplyAllForm'],
    ['sender', 'displayReplyForm'],
  ] as const)(
    'opens the %s reply through the synchronous form below Mailbox 1.9',
    async (recipients, method) => {
      const item = readItem();
      stubOffice(item, '1.8');

      const outcome = await openOutlookReply(recipients, 'Hi', {
        expectedItemKey,
        draftId: 'call-1',
      });

      expect(outcome).toEqual({ status: 'opened' });
      expect(item[method]).toHaveBeenCalledExactlyOnceWith({
        htmlBody: expect.stringMatching(
          /^<div id="ayunis-draft-[0-9a-f]+">Hi<\/div>$/,
        ) as string,
      });
      expect(item.displayReplyFormAsync).not.toHaveBeenCalled();
      expect(item.displayReplyAllFormAsync).not.toHaveBeenCalled();
    },
  );

  it('lets Insert in the reply it opened recognize the draft instead of adding it again', async () => {
    const item = readItem();
    stubOffice(item, '1.8');
    await openOutlookReply('all', 'Hi', { expectedItemKey, draftId: 'call-1' });
    const [{ htmlBody }] = item.displayReplyAllForm.mock.calls[0] as [
      { htmlBody: string },
    ];
    const succeed =
      (value?: unknown) =>
      (...args: unknown[]) =>
        (args.at(-1) as (result: object) => void)({
          status: 'succeeded',
          value,
        });
    const reply = {
      inReplyTo: item.internetMessageId,
      subject: { setAsync: vi.fn(succeed()) },
      body: {
        getTypeAsync: vi.fn(succeed('html')),
        getAsync: vi.fn(
          succeed(
            `<html><body>${htmlBody}<div id="divRplyFwdMsg">Quoted</div></body></html>`,
          ),
        ),
        setAsync: vi.fn(succeed()),
        prependAsync: vi.fn(succeed()),
      },
      saveAsync: vi.fn(),
    };
    stubOffice(reply, '1.8');

    const outcome = await executeOutlookTool(
      'outlook__move_email_to_composer',
      { body: 'Hi' },
      { draftId: 'call-1' },
    );

    expect(outcome).toEqual({ status: 'done', action: 'inserted' });
    expect(reply.body.prependAsync).not.toHaveBeenCalled();
    expect(reply.body.setAsync).not.toHaveBeenCalled();
  });
});
