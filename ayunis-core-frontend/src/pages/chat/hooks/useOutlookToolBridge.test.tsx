import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmbeddedContext } from '@/shared/contexts/embedded/embeddedContext';
import {
  notifyOutlookItemChanged,
  rememberChatItem,
} from '@/features/outlook-tools';
import type { Message } from '@/pages/chat/model/openapi';
import { useOutlookToolBridge } from './useOutlookToolBridge';

type Callback = (result: { status: string; value?: unknown }) => void;

const succeed =
  (value?: unknown) =>
  (...args: unknown[]) =>
    (args[args.length - 1] as Callback)({ status: 'succeeded', value });

function stubOffice(item: object | undefined) {
  vi.stubGlobal('Office', {
    AsyncResultStatus: { Succeeded: 'succeeded', Failed: 'failed' },
    CoercionType: { Text: 'text', Html: 'html' },
    context: {
      requirements: { isSetSupported: () => true },
      mailbox: { item },
    },
  });
}

function changeOfficeItem(item: object | undefined) {
  act(() => {
    stubOffice(item);
    notifyOutlookItemChanged();
  });
}

function readItem() {
  return {
    itemId: 'mail-1',
    subject: 'Budget',
    from: { displayName: 'Alice', emailAddress: 'alice@example.org' },
    to: [],
    cc: [],
    attachments: [],
    body: { getAsync: vi.fn(succeed('Hello Bob')) },
    displayReplyForm: vi.fn(),
    displayReplyFormAsync: vi.fn(succeed()),
    displayReplyAllForm: vi.fn(),
    displayReplyAllFormAsync: vi.fn(succeed()),
  };
}

const fail =
  (message: string) =>
  (...args: unknown[]) =>
    (args[args.length - 1] as Callback)({
      status: 'failed',
      error: { message },
    } as Parameters<Callback>[0]);

function composeItem() {
  return {
    subject: { getAsync: vi.fn(succeed('')), setAsync: vi.fn(succeed()) },
    body: {
      getAsync: vi.fn(succeed('<html><body></body></html>')),
      getTypeAsync: vi.fn(succeed('html')),
      setAsync: vi.fn(succeed()),
      prependAsync: vi.fn(succeed()),
    },
    saveAsync: vi.fn(succeed('saved-id')),
  };
}

function turn(id: string, name: string, params: object = {}): Message[] {
  return [
    {
      id: `user-${id}`,
      role: 'user',
      createdAt: '2026-11-18T09:00:00.000Z',
      content: [{ type: 'text', text: 'Help me with this email' }],
    },
    {
      id: `assistant-${id}`,
      role: 'assistant',
      createdAt: '2026-11-18T09:00:01.000Z',
      content: [{ type: 'tool_use', id, name, params }],
    },
  ] as unknown as Message[];
}

interface Props {
  messages: Message[];
  isStreaming: boolean;
}

// The chat → email record outlives a page, so every test gets its own chat.
let chats = 0;

function renderBridge(
  embedded: boolean,
  initialMessages: Message[] = [],
  threadId = `thread-${++chats}`,
) {
  const sendToolResult = vi.fn().mockResolvedValue(undefined);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <EmbeddedContext.Provider value={embedded}>
      {children}
    </EmbeddedContext.Provider>
  );
  const hook = renderHook(
    ({ messages, isStreaming }: Props) =>
      useOutlookToolBridge({
        threadId,
        messages,
        isStreaming,
        isCheckingForRun: false,
        piiMasks: [{ token: '{{pii:PERSON_NAME_1}}', value: 'Bob Becker' }],
        sendToolResult,
      }),
    {
      wrapper,
      initialProps: { messages: initialMessages, isStreaming: false },
    },
  );

  /** The user sends a message and the run streams `messages`, then ends. */
  function run(messages: Message[], failed = false) {
    act(() => hook.result.current.beginRun());
    hook.rerender({ messages, isStreaming: true });
    act(() => hook.result.current.runEnded(failed));
    hook.rerender({ messages, isStreaming: false });
  }

  return { ...hook, run, sendToolResult, threadId };
}

const draftCall = {
  id: 'call-1',
  name: 'outlook__draft_email',
} as const;

afterEach(() => vi.unstubAllGlobals());

describe(useOutlookToolBridge.name, () => {
  it('leaves web runs alone: no Outlook tool runs and no tool result is sent outside the pane', async () => {
    const { result, run, sendToolResult } = renderBridge(false);

    run(turn('call-1', 'outlook__read_email'));
    await act(() => Promise.resolve());

    expect(result.current.bridge).toBeNull();
    expect(sendToolResult).not.toHaveBeenCalled();
  });

  it('posts the open email back to the run that asked for it', async () => {
    stubOffice(readItem());
    const { run, sendToolResult } = renderBridge(true);

    run(turn('call-1', 'outlook__read_email'));

    await waitFor(() => expect(sendToolResult).toHaveBeenCalledOnce());
    const [{ toolId, toolName, result }] = sendToolResult.mock.calls[0] as [
      { toolId: string; toolName: string; result: string },
    ];
    expect({ toolId, toolName }).toEqual({
      toolId: 'call-1',
      toolName: 'outlook__read_email',
    });
    expect(JSON.parse(result)).toMatchObject({
      subject: 'Budget',
      body: 'Hello Bob',
    });
  });

  it('does not run the calls of a chat that was already there when it opened', async () => {
    const item = composeItem();
    stubOffice(item);
    const history = turn('old-call', 'outlook__draft_email', { body: 'Old' });
    const { run, sendToolResult } = renderBridge(true, history);

    run(history);
    await act(() => Promise.resolve());

    expect(item.body.prependAsync).not.toHaveBeenCalled();
    expect(sendToolResult).not.toHaveBeenCalled();
  });

  it("answers the read call of a new chat's first run that was saved before the chat opened", async () => {
    stubOffice(readItem());
    const firstRun = turn('call-1', 'outlook__read_email');
    const { result, rerender, sendToolResult } = renderBridge(true, firstRun);

    // The new chat page sent the first message; this page takes over its stream.
    act(() => result.current.beginRun({ takesOverStartedRun: true }));
    rerender({ messages: firstRun, isStreaming: true });
    act(() => result.current.runEnded(false));
    rerender({ messages: firstRun, isStreaming: false });

    await waitFor(() => expect(sendToolResult).toHaveBeenCalledOnce());
  });

  it('does not read an email opened after a new chat was created with none open', async () => {
    stubOffice({ ...readItem(), itemId: 'mail-2' });
    const threadId = `thread-${++chats}`;
    rememberChatItem(threadId, null);
    const firstRun = turn('call-1', 'outlook__read_email');
    const { result, rerender, sendToolResult } = renderBridge(
      true,
      firstRun,
      threadId,
    );

    act(() => result.current.beginRun({ takesOverStartedRun: true }));
    rerender({ messages: firstRun, isStreaming: true });
    act(() => result.current.runEnded(false));
    rerender({ messages: firstRun, isStreaming: false });

    await waitFor(() => expect(sendToolResult).toHaveBeenCalledOnce());
    const [{ result: posted }] = sendToolResult.mock.calls[0] as [
      { result: string },
    ];
    expect(posted).toContain('the open email changed');
  });

  it("does not write a reattached run's draft into a mail opened after its chat was about none", async () => {
    const reply = composeItem();
    stubOffice(reply);
    const threadId = `thread-${++chats}`;
    rememberChatItem(threadId, null);
    const { result, rerender } = renderBridge(true, [], threadId);
    const messages = turn('call-1', 'outlook__draft_email', { body: 'Hi' });

    rerender({ messages, isStreaming: true });
    act(() => result.current.runEnded(false));
    rerender({ messages, isStreaming: false });

    await waitFor(() =>
      expect(result.current.bridge?.stateFor('call-1')).toEqual({
        status: 'failed',
        failure: 'itemChanged',
      }),
    );
    expect(reply.body.prependAsync).not.toHaveBeenCalled();
  });

  it('runs nothing from a run that failed', async () => {
    const item = composeItem();
    stubOffice(item);
    const { run } = renderBridge(true);

    run(turn('call-1', 'outlook__draft_email', { body: 'Hi' }), true);
    await act(() => Promise.resolve());

    expect(item.body.prependAsync).not.toHaveBeenCalled();
  });

  it('writes a draft into the reply being written, with the anonymised names restored', async () => {
    const item = composeItem();
    stubOffice(item);
    const { result, run } = renderBridge(true);

    run(
      turn('call-1', 'outlook__draft_email', {
        body: 'Dear {{pii:PERSON_NAME_1}}',
      }),
    );

    await waitFor(() =>
      expect(item.body.prependAsync).toHaveBeenCalledWith(
        expect.stringMatching(
          /^<div id="ayunis-draft-[^"]+">Dear Bob Becker<\/div>$/,
        ),
        { coercionType: 'html' },
        expect.any(Function),
      ),
    );
    await waitFor(() =>
      expect(result.current.bridge?.stateFor('call-1')).toEqual({
        status: 'done',
        action: 'inserted',
      }),
    );
  });

  it('refuses to write the draft of a run it did not start once the user moved to another email', async () => {
    const item = composeItem();
    stubOffice({ ...item, itemId: 'draft-1' });
    const { result, rerender } = renderBridge(true);
    const messages = turn('call-1', 'outlook__draft_email', { body: 'Hi' });

    stubOffice({ ...item, itemId: 'draft-2' });
    // A reattached run streams in without the user sending anything.
    rerender({ messages, isStreaming: true });
    act(() => result.current.runEnded(false));
    rerender({ messages, isStreaming: false });

    await waitFor(() =>
      expect(result.current.bridge?.stateFor('call-1')).toEqual({
        status: 'failed',
        failure: 'itemChanged',
      }),
    );
    expect(item.body.prependAsync).not.toHaveBeenCalled();
  });

  it('inserts a read-mode draft only after the matching reply is open and the user clicks', async () => {
    const item = { ...readItem(), internetMessageId: '<mail-1@example.org>' };
    stubOffice(item);
    const { result, run, rerender } = renderBridge(true);
    const params = { body: 'Dear {{pii:PERSON_NAME_1}}' };
    const messages = turn('call-1', 'outlook__draft_email', params);

    run(messages);
    await act(() => Promise.resolve());
    expect(result.current.bridge?.draftAction(draftCall)).toBe('reply');
    expect(item.displayReplyFormAsync).not.toHaveBeenCalled();
    expect(item.displayReplyAllFormAsync).not.toHaveBeenCalled();

    const reply = { ...composeItem(), inReplyTo: item.internetMessageId };
    stubOffice(reply);
    rerender({ messages, isStreaming: false });
    expect(reply.body.prependAsync).not.toHaveBeenCalled();
    expect(result.current.bridge?.draftAction(draftCall)).toBe('insert');
    act(() => result.current.bridge?.insertDraft({ ...draftCall, params }));

    await waitFor(() =>
      expect(reply.body.prependAsync).toHaveBeenCalledWith(
        expect.stringContaining('>Dear Bob Becker</div>'),
        { coercionType: 'html' },
        expect.any(Function),
      ),
    );
    expect(reply.subject.setAsync).not.toHaveBeenCalled();
  });

  it.each([
    ['all', 'displayReplyAllFormAsync', 'displayReplyFormAsync'],
    ['sender', 'displayReplyFormAsync', 'displayReplyAllFormAsync'],
  ] as const)(
    'opens the %s reply form once with the draft as HTML, the anonymised names restored and no status left',
    async (recipients, method, otherMethod) => {
      const item = { ...readItem(), internetMessageId: '<mail-1@example.org>' };
      stubOffice(item);
      const { result, run } = renderBridge(true);
      const call = {
        ...draftCall,
        params: { body: 'Dear {{pii:PERSON_NAME_1}} & co\nBye' },
      };
      run(turn(call.id, call.name, call.params));
      await act(() => Promise.resolve());

      act(() => result.current.bridge?.openReply(call, recipients));

      await waitFor(() => expect(item[method]).toHaveBeenCalledOnce());
      expect(item[method]).toHaveBeenCalledWith(
        {
          htmlBody: expect.stringMatching(
            /^<div id="ayunis-draft-[^"]+">Dear Bob Becker &amp; co<br>Bye<\/div>$/,
          ) as string,
        },
        expect.any(Function),
      );
      expect(item[otherMethod]).not.toHaveBeenCalled();
      await act(() => Promise.resolve());
      expect(result.current.bridge?.stateFor(call.id)).toBeUndefined();
      expect(result.current.bridge?.draftAction(draftCall)).toBe('reply');
    },
  );

  it.each([
    ['fails the call', fail('The body exceeds 32 KB')],
    [
      'throws',
      () => {
        throw new Error('The body exceeds 32 KB');
      },
    ],
  ])(
    'shows the failed state and keeps the buttons when Outlook %s instead of opening the reply',
    async (_, refuse) => {
      const item = { ...readItem(), internetMessageId: '<mail-1@example.org>' };
      item.displayReplyAllFormAsync = vi.fn(refuse);
      stubOffice(item);
      const { result, run } = renderBridge(true);
      const call = { ...draftCall, params: { body: 'Dear Bob' } };
      run(turn(call.id, call.name, call.params));
      await act(() => Promise.resolve());

      act(() => result.current.bridge?.openReply(call, 'all'));

      await waitFor(() =>
        expect(result.current.bridge?.stateFor(call.id)).toEqual({
          status: 'failed',
          failure: 'officeFailed',
          message: 'The body exceeds 32 KB',
        }),
      );
      expect(result.current.bridge?.draftAction(draftCall)).toBe('reply');
    },
  );

  it('offers no reply and opens none once the pinned pane moved to another email', async () => {
    const item = { ...readItem(), internetMessageId: '<mail-1@example.org>' };
    stubOffice(item);
    const { result, run } = renderBridge(true);
    const call = { ...draftCall, params: { body: 'Dear Bob' } };
    run(turn(call.id, call.name, call.params));
    await act(() => Promise.resolve());
    expect(result.current.bridge?.draftAction(draftCall)).toBe('reply');
    const staleOpenReply = result.current.bridge?.openReply;

    const other = {
      ...readItem(),
      itemId: 'mail-2',
      internetMessageId: '<mail-2@example.org>',
    };
    changeOfficeItem(other);
    expect(result.current.bridge?.draftAction(draftCall)).toBeNull();
    act(() => staleOpenReply?.(call, 'all'));
    await act(() => Promise.resolve());

    expect(other.displayReplyAllFormAsync).not.toHaveBeenCalled();
    expect(item.displayReplyAllFormAsync).not.toHaveBeenCalled();
  });

  it('offers the reply only on the latest draft of the chat', async () => {
    const item = { ...readItem(), internetMessageId: '<mail-1@example.org>' };
    stubOffice(item);
    const { result, run } = renderBridge(true);
    const first = turn(draftCall.id, draftCall.name, { body: 'First' });
    run(first);
    run([...first, ...turn('new-call', draftCall.name, { body: 'Revised' })]);
    await act(() => Promise.resolve());

    expect(result.current.bridge?.draftAction(draftCall)).toBeNull();
    expect(
      result.current.bridge?.draftAction({ ...draftCall, id: 'new-call' }),
    ).toBe('reply');
    act(() =>
      result.current.bridge?.openReply(
        { ...draftCall, params: { body: 'First' } },
        'sender',
      ),
    );
    await act(() => Promise.resolve());
    expect(item.displayReplyFormAsync).not.toHaveBeenCalled();
  });

  it('offers Insert again after discarding a reply and opening another for the same email', async () => {
    const item = { ...readItem(), internetMessageId: '<mail-1@example.org>' };
    stubOffice(item);
    const { result, run } = renderBridge(true);
    const call = { ...draftCall, params: { body: 'Dear Bob' } };
    run(turn(call.id, call.name, call.params));

    const firstReply = { ...composeItem(), inReplyTo: item.internetMessageId };
    changeOfficeItem(firstReply);
    expect(result.current.bridge?.draftAction(draftCall)).toBe('insert');
    act(() => result.current.bridge?.insertDraft(call));
    await waitFor(() =>
      expect(result.current.bridge?.stateFor(call.id)).toEqual({
        status: 'done',
        action: 'inserted',
      }),
    );
    expect(firstReply.body.prependAsync).toHaveBeenCalledOnce();

    changeOfficeItem(item);
    const nextReply = { ...composeItem(), inReplyTo: item.internetMessageId };
    changeOfficeItem(nextReply);
    expect(result.current.bridge?.draftAction(draftCall)).toBe('insert');
    expect(result.current.bridge?.stateFor(call.id)).toBeUndefined();
    expect(nextReply.body.prependAsync).not.toHaveBeenCalled();

    act(() => result.current.bridge?.insertDraft(call));
    await waitFor(() =>
      expect(result.current.bridge?.stateFor(call.id)).toEqual({
        status: 'done',
        action: 'inserted',
      }),
    );
    expect(nextReply.body.prependAsync).toHaveBeenCalledOnce();
  });

  it('keeps the new reply status when an earlier insert finishes late', async () => {
    const item = { ...readItem(), internetMessageId: '<mail-1@example.org>' };
    stubOffice(item);
    const { result, run } = renderBridge(true);
    const call = { ...draftCall, params: { body: 'Dear Bob' } };
    run(turn(call.id, call.name, call.params));

    const firstReply = { ...composeItem(), inReplyTo: item.internetMessageId };
    let finishFirst: Callback | undefined;
    firstReply.body.prependAsync.mockImplementation((...args: unknown[]) => {
      finishFirst = args.at(-1) as Callback;
    });
    changeOfficeItem(firstReply);
    act(() => result.current.bridge?.insertDraft(call));
    await waitFor(() =>
      expect(firstReply.body.prependAsync).toHaveBeenCalledOnce(),
    );

    const nextReply = { ...composeItem(), inReplyTo: item.internetMessageId };
    changeOfficeItem(nextReply);
    expect(result.current.bridge?.stateFor(call.id)).toBeUndefined();
    act(() => result.current.bridge?.insertDraft(call));
    await waitFor(() =>
      expect(result.current.bridge?.stateFor(call.id)).toEqual({
        status: 'done',
        action: 'inserted',
      }),
    );

    await act(async () => {
      finishFirst?.({ status: 'succeeded' });
    });
    expect(result.current.bridge?.stateFor(call.id)).toEqual({
      status: 'done',
      action: 'inserted',
    });
  });

  it('rejects an earlier Insert after a newer draft is written into the composer', async () => {
    const item = { ...readItem(), internetMessageId: '<mail-1@example.org>' };
    stubOffice(item);
    const { result, run, rerender } = renderBridge(true);
    const params = { body: 'First draft' };
    const first = turn(draftCall.id, draftCall.name, params);
    run(first);
    await act(() => Promise.resolve());

    const reply = { ...composeItem(), inReplyTo: item.internetMessageId };
    stubOffice(reply);
    rerender({ messages: first, isStreaming: false });
    const oldInsert = result.current.bridge?.insertDraft;
    expect(result.current.bridge?.draftAction(draftCall)).toBe('insert');

    run([
      ...first,
      ...turn('new-call', draftCall.name, { body: 'Revised draft' }),
    ]);
    await waitFor(() => expect(reply.body.prependAsync).toHaveBeenCalledOnce());
    expect(result.current.bridge?.draftAction(draftCall)).toBeNull();
    act(() => oldInsert?.({ ...draftCall, params }));
    await act(() => Promise.resolve());

    expect(reply.body.prependAsync).toHaveBeenCalledOnce();
    expect(reply.body.setAsync).not.toHaveBeenCalled();
  });

  it('keeps the current draft insertable after a follow-up with no new draft', async () => {
    const item = { ...readItem(), internetMessageId: '<mail-1@example.org>' };
    stubOffice(item);
    const { result, run, rerender } = renderBridge(true);
    const params = { body: 'First draft' };
    const first = turn(draftCall.id, draftCall.name, params);
    run(first);
    await act(() => Promise.resolve());

    const reply = { ...composeItem(), inReplyTo: item.internetMessageId };
    stubOffice(reply);
    rerender({ messages: first, isStreaming: false });
    run([...first, ...turn('follow-up', 'outlook__read_email')]);
    await act(() => Promise.resolve());

    expect(result.current.bridge?.draftAction(draftCall)).toBe('insert');
    act(() => result.current.bridge?.insertDraft({ ...draftCall, params }));
    await waitFor(() => expect(reply.body.prependAsync).toHaveBeenCalledOnce());
  });

  it('keeps the draft insertable in a new reply pane after a follow-up in the reading pane', async () => {
    const item = { ...readItem(), internetMessageId: '<mail-1@example.org>' };
    stubOffice(item);
    const readPane = renderBridge(true);
    const params = { body: 'First draft' };
    const draft = turn(draftCall.id, draftCall.name, params);
    readPane.run(draft);
    await act(() => Promise.resolve());
    const messages = [...draft, ...turn('follow-up', 'outlook__read_email')];
    readPane.run(messages);
    await act(() => Promise.resolve());
    readPane.unmount();

    const unrelatedId = '<mail-2@example.org>';
    const unrelatedReply = { ...composeItem(), inReplyTo: unrelatedId };
    stubOffice(unrelatedReply);
    rememberChatItem(readPane.threadId, `read:internet:${unrelatedId}`);
    const unrelatedPane = renderBridge(true, draft, readPane.threadId);
    expect(
      unrelatedPane.result.current.bridge?.draftAction(draftCall),
    ).toBeNull();
    unrelatedPane.unmount();

    const matchingReply = {
      ...composeItem(),
      inReplyTo: item.internetMessageId,
    };
    stubOffice(matchingReply);
    const replyPane = renderBridge(true, messages, readPane.threadId);
    expect(replyPane.result.current.bridge?.draftAction(draftCall)).toBe(
      'insert',
    );
    act(() =>
      replyPane.result.current.bridge?.insertDraft({ ...draftCall, params }),
    );
    await waitFor(() =>
      expect(matchingReply.body.prependAsync).toHaveBeenCalledOnce(),
    );
  });

  it('refuses a stale Insert click after the user opens a reply to a different email', async () => {
    const item = { ...readItem(), internetMessageId: '<mail-1@example.org>' };
    stubOffice(item);
    const { result, run } = renderBridge(true);
    run(turn('call-1', 'outlook__draft_email', { body: 'Dear Bob' }));
    await act(() => Promise.resolve());

    const unrelatedReply = {
      ...composeItem(),
      inReplyTo: '<mail-2@example.org>',
    };
    stubOffice(unrelatedReply);
    act(() =>
      result.current.bridge?.insertDraft({
        ...draftCall,
        params: { body: 'Dear Bob' },
      }),
    );

    await waitFor(() =>
      expect(result.current.bridge?.stateFor('call-1')).toEqual({
        status: 'failed',
        failure: 'itemChanged',
      }),
    );
    expect(unrelatedReply.body.prependAsync).not.toHaveBeenCalled();
  });

  it('offers no reply for a draft from before the chat opened, which may be for another email', async () => {
    const item = { ...readItem(), itemId: 'mail-2' };
    stubOffice(item);
    const history = turn('call-1', 'outlook__draft_email', {
      body: 'Dear Bob',
    });
    const { result } = renderBridge(true, history);
    await act(() => Promise.resolve());

    expect(result.current.bridge?.draftAction(draftCall)).toBeNull();
    act(() =>
      result.current.bridge?.insertDraft({
        ...draftCall,
        params: { body: 'Dear Bob' },
      }),
    );
    await act(() => Promise.resolve());
    expect(item.displayReplyFormAsync).not.toHaveBeenCalled();
  });

  it("offers Insert after reopening in compose only for the latest turn's draft for that reply", async () => {
    const messageId = '<mail-1@example.org>';
    const reply = { ...composeItem(), inReplyTo: messageId };
    stubOffice(reply);
    const threadId = `thread-${++chats}`;
    rememberChatItem(threadId, `read:internet:${messageId}`);
    const reopened = [
      ...turn('old-call', 'outlook__draft_email', { body: 'Old' }),
      ...turn('call-1', 'outlook__draft_email', { body: 'Dear Bob' }),
    ];
    const { result } = renderBridge(true, reopened, threadId);

    expect(result.current.bridge?.draftAction(draftCall)).toBe('insert');
    expect(
      result.current.bridge?.draftAction({ ...draftCall, id: 'old-call' }),
    ).toBeNull();
    expect(reply.body.prependAsync).not.toHaveBeenCalled();
  });

  it('answers a read the run still waits for when its chat is reopened next to the same email', async () => {
    const item = readItem();
    stubOffice(item);
    const threadId = `thread-${++chats}`;
    rememberChatItem(threadId, 'read:mail-1');
    const waiting = turn('call-1', 'outlook__read_email');

    const { sendToolResult } = renderBridge(true, waiting, threadId);

    await waitFor(() => expect(sendToolResult).toHaveBeenCalledOnce());
    expect(sendToolResult.mock.calls[0]?.[0]).toMatchObject({
      toolId: 'call-1',
      toolName: 'outlook__read_email',
    });
  });

  it('returns an item-changed result when a read from this pane arrives after opening its reply', async () => {
    const item = { ...readItem(), internetMessageId: '<mail-1@example.org>' };
    stubOffice(item);
    const { result, rerender, sendToolResult } = renderBridge(true);
    const waiting = turn('call-1', 'outlook__read_email');
    act(() => result.current.beginRun());
    rerender({ messages: waiting.slice(0, 1), isStreaming: true });

    const reply = { ...composeItem(), inReplyTo: item.internetMessageId };
    changeOfficeItem(reply);
    rerender({ messages: waiting, isStreaming: true });
    act(() => result.current.runEnded(false));
    rerender({ messages: waiting, isStreaming: false });

    await waitFor(() =>
      expect(sendToolResult).toHaveBeenCalledExactlyOnceWith({
        toolId: 'call-1',
        toolName: 'outlook__read_email',
        result: JSON.stringify({
          error: 'the open email changed since this request started',
        }),
      }),
    );
    expect(item.body.getAsync).not.toHaveBeenCalled();
    expect(reply.body.getAsync).not.toHaveBeenCalled();
  });

  it('lets the original pane answer a read that streams in after its reply opens', async () => {
    const item = { ...readItem(), internetMessageId: '<mail-1@example.org>' };
    const reply = { ...composeItem(), inReplyTo: item.internetMessageId };
    stubOffice(reply);
    const threadId = `thread-${++chats}`;
    rememberChatItem(threadId, `read:internet:${item.internetMessageId}`);
    const waiting = turn('call-1', 'outlook__read_email');
    const { result, rerender, sendToolResult, unmount } = renderBridge(
      true,
      [],
      threadId,
    );

    rerender({ messages: waiting, isStreaming: true });
    act(() => result.current.runEnded(false));
    rerender({ messages: waiting, isStreaming: false });
    await act(() => Promise.resolve());
    expect(sendToolResult).not.toHaveBeenCalled();
    expect(reply.body.getAsync).not.toHaveBeenCalled();

    unmount();
    stubOffice(item);
    const original = renderBridge(true, waiting, threadId);
    await waitFor(() => expect(original.sendToolResult).toHaveBeenCalledOnce());
    expect(item.body.getAsync).toHaveBeenCalledOnce();
  });

  it('leaves a waiting read alone when its chat is reopened next to another email, and never replays a draft', async () => {
    const item = composeItem();
    stubOffice({ ...item, itemId: 'draft-2' });
    const threadId = `thread-${++chats}`;
    rememberChatItem(threadId, 'compose:draft-1');
    const waiting = [
      ...turn('call-1', 'outlook__draft_email', { body: 'Hi' }),
      ...turn('call-2', 'outlook__read_email').slice(1),
    ];

    const { sendToolResult } = renderBridge(true, waiting, threadId);
    await act(() => Promise.resolve());

    expect(sendToolResult).not.toHaveBeenCalled();
    expect(item.body.prependAsync).not.toHaveBeenCalled();
  });

  it("does not read another email for a new chat's first run once the user moved away from the email it was started on", async () => {
    stubOffice({ ...readItem(), itemId: 'mail-2' });
    const threadId = `thread-${++chats}`;
    rememberChatItem(threadId, 'read:mail-1');
    const firstRun = turn('call-1', 'outlook__read_email');
    const { result, rerender, sendToolResult } = renderBridge(
      true,
      firstRun,
      threadId,
    );

    act(() => result.current.beginRun({ takesOverStartedRun: true }));
    rerender({ messages: firstRun, isStreaming: true });
    act(() => result.current.runEnded(false));
    rerender({ messages: firstRun, isStreaming: false });

    await waitFor(() => expect(sendToolResult).toHaveBeenCalledOnce());
    const [{ result: posted }] = sendToolResult.mock.calls[0] as [
      { result: string },
    ];
    expect(posted).toContain('the open email changed');
  });

  it('treats a draft by the mail its run was about, not the mail open when the run ends', async () => {
    const reply = { ...composeItem(), itemId: 'draft-1' };
    stubOffice(reply);
    const { result, rerender } = renderBridge(true);
    const messages = turn('call-1', 'outlook__draft_email', { body: 'Hi' });
    act(() => result.current.beginRun());
    rerender({ messages, isStreaming: true });

    const received = readItem();
    stubOffice(received);
    act(() => result.current.runEnded(false));
    rerender({ messages, isStreaming: false });

    await waitFor(() =>
      expect(result.current.bridge?.stateFor('call-1')).toEqual({
        status: 'failed',
        failure: 'itemChanged',
      }),
    );
    expect(result.current.bridge?.draftAction(draftCall)).toBeNull();
    expect(received.displayReplyFormAsync).not.toHaveBeenCalled();
  });

  it('does not write a draft into a reply opened after a run that started with no mail open', async () => {
    stubOffice(undefined);
    const { result, rerender } = renderBridge(true);
    const messages = turn('call-1', 'outlook__draft_email', { body: 'Hi' });
    act(() => result.current.beginRun());
    rerender({ messages, isStreaming: true });

    const reply = composeItem();
    stubOffice(reply);
    act(() => result.current.runEnded(false));
    rerender({ messages, isStreaming: false });

    await waitFor(() =>
      expect(result.current.bridge?.stateFor('call-1')).toEqual({
        status: 'failed',
        failure: 'itemChanged',
      }),
    );
    expect(reply.body.prependAsync).not.toHaveBeenCalled();
  });

  it('never offers to rewrite a draft already written into the reply being written', async () => {
    const item = composeItem();
    stubOffice(item);
    const { result, run } = renderBridge(true);
    const params = { body: 'Dear Bob' };

    run(turn('call-1', 'outlook__draft_email', params));
    await waitFor(() => expect(item.body.prependAsync).toHaveBeenCalledOnce());

    expect(result.current.bridge?.draftAction(draftCall)).toBeNull();
    act(() =>
      result.current.bridge?.insertDraft({
        id: 'call-1',
        name: 'outlook__draft_email',
        params,
      }),
    );
    await act(() => Promise.resolve());
    expect(item.body.prependAsync).toHaveBeenCalledOnce();
    expect(item.body.setAsync).not.toHaveBeenCalled();
  });

  it('drops a read result once the user sent another message while it was read', async () => {
    const item = readItem();
    let finishRead: Callback | undefined;
    item.body.getAsync = vi.fn((...args: unknown[]) => {
      finishRead = args[1] as Callback;
    });
    stubOffice(item);
    const { result, run, sendToolResult } = renderBridge(true);
    const first = turn('call-1', 'outlook__read_email');

    run(first);
    await waitFor(() => expect(finishRead).toBeDefined());
    act(() => result.current.beginRun());
    await act(async () => {
      finishRead?.({ status: 'succeeded', value: 'Hello Bob' });
      await Promise.resolve();
    });

    expect(sendToolResult).not.toHaveBeenCalled();
  });
});
