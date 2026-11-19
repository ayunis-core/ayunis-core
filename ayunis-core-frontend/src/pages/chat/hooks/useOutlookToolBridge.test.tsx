import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmbeddedContext } from '@/shared/contexts/embedded/embeddedContext';
import { rememberChatItem } from '@/features/outlook-tools';
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
  };
}

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

  it('leaves opening a reply from the read view to the user', async () => {
    const item = readItem();
    stubOffice(item);
    const { result, run } = renderBridge(true);
    const params = { body: 'Dear Bob' };

    run(turn('call-1', 'outlook__draft_email', params));
    await act(() => Promise.resolve());
    expect(item.displayReplyFormAsync).not.toHaveBeenCalled();
    expect(result.current.bridge?.canOpenReply(draftCall)).toBe(true);

    act(() =>
      result.current.bridge?.openReply({
        id: 'call-1',
        name: 'outlook__draft_email',
        params,
      }),
    );
    await waitFor(() =>
      expect(item.displayReplyFormAsync).toHaveBeenCalledWith(
        {
          htmlBody: expect.stringMatching(
            /^<div id="ayunis-draft-[^"]+">Dear Bob<\/div>$/,
          ) as string,
        },
        expect.any(Function),
      ),
    );
  });

  it('refuses to open a reply with a draft once the user moved to another email', async () => {
    const item = readItem();
    stubOffice(item);
    const { result, run } = renderBridge(true);
    run(turn('call-1', 'outlook__draft_email', { body: 'Dear Bob' }));
    await act(() => Promise.resolve());

    stubOffice({ ...readItem(), itemId: 'mail-2' });
    act(() =>
      result.current.bridge?.openReply({
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
    expect(item.displayReplyFormAsync).not.toHaveBeenCalled();
  });

  it('offers no reply for a draft from before the chat opened, which may be for another email', async () => {
    const item = { ...readItem(), itemId: 'mail-2' };
    stubOffice(item);
    const history = turn('call-1', 'outlook__draft_email', {
      body: 'Dear Bob',
    });
    const { result } = renderBridge(true, history);
    await act(() => Promise.resolve());

    expect(result.current.bridge?.canOpenReply(draftCall)).toBe(false);
    act(() =>
      result.current.bridge?.openReply({
        ...draftCall,
        params: { body: 'Dear Bob' },
      }),
    );
    await act(() => Promise.resolve());
    expect(item.displayReplyFormAsync).not.toHaveBeenCalled();
  });

  it("offers Insert after a reload only for the latest turn's drafts, on the chat's email", async () => {
    const item = readItem();
    stubOffice(item);
    const threadId = `thread-${++chats}`;
    rememberChatItem(threadId, 'read:mail-1');
    const reopened = [
      ...turn('old-call', 'outlook__draft_email', { body: 'Old' }),
      ...turn('call-1', 'outlook__draft_email', { body: 'Dear Bob' }),
    ];
    const { result } = renderBridge(true, reopened, threadId);
    await act(() => Promise.resolve());

    expect(result.current.bridge?.canOpenReply(draftCall)).toBe(true);
    expect(
      result.current.bridge?.canOpenReply({ ...draftCall, id: 'old-call' }),
    ).toBe(false);

    stubOffice({ ...readItem(), itemId: 'mail-2' });
    act(() =>
      result.current.bridge?.openReply({
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

    stubOffice(item);
    act(() =>
      result.current.bridge?.openReply({
        ...draftCall,
        params: { body: 'Dear Bob' },
      }),
    );
    await waitFor(() => expect(item.displayReplyFormAsync).toHaveBeenCalled());
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
    expect(result.current.bridge?.canOpenReply(draftCall)).toBe(false);
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

    expect(result.current.bridge?.canOpenReply(draftCall)).toBe(false);
    act(() =>
      result.current.bridge?.openReply({
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
