import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaneChatApi, PaneRunInput } from '@/outlook/api/pane-chat-api';
import type { PaneMessage } from '@/outlook/lib/pane-messages';
import type { RunStreamEvent } from '@/outlook/lib/read-run-stream';
import { usePaneChat } from '@/outlook/lib/use-pane-chat';

const executeOutlookTool = vi.hoisted(() => vi.fn());
vi.mock('@/outlook/lib/outlook-tools/execute-outlook-tool', () => ({
  executeOutlookTool,
}));

const THREAD_ID = 'thread-1';

function assistantCalling(
  id: string,
  call: { id: string; name: string; params?: Record<string, unknown> },
  stream?: { status: 'invalid'; argumentsJson: string },
): PaneMessage {
  return {
    id,
    threadId: THREAD_ID,
    createdAt: '2026-11-13T10:00:00.000Z',
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: call.id,
        name: call.name,
        params: call.params ?? {},
        ...(stream ? { stream } : {}),
      },
    ],
  };
}

/** One assistant turn calling several tools, as a confirmation pause leaves it. */
function assistantCallingMany(
  id: string,
  calls: {
    id: string;
    name: string;
    params?: Record<string, unknown>;
    requiresConfirmation?: boolean;
  }[],
): PaneMessage {
  return {
    id,
    threadId: THREAD_ID,
    createdAt: '2026-11-13T10:00:00.000Z',
    role: 'assistant',
    content: calls.map((call) => ({
      type: 'tool_use',
      id: call.id,
      name: call.name,
      params: call.params ?? {},
      ...(call.requiresConfirmation ? { requiresConfirmation: true } : {}),
    })),
  };
}

function assistantText(id: string, text: string): PaneMessage {
  return {
    id,
    threadId: THREAD_ID,
    createdAt: '2026-11-13T10:00:01.000Z',
    role: 'assistant',
    content: [{ type: 'text', text }],
  };
}

function messageEvent(message: PaneMessage): RunStreamEvent {
  return {
    type: 'message',
    message,
    threadId: THREAD_ID,
    timestamp: '2026-11-13T10:00:00.000Z',
  };
}

/** Each run streams the next batch of messages. */
function fakeApi(runs: PaneMessage[][], history: PaneMessage[] = []) {
  const inputs: PaneRunInput[] = [];
  const api: PaneChatApi = {
    listThreads: vi.fn(),
    createThread: vi.fn(() =>
      Promise.resolve({ id: THREAD_ID } as Awaited<
        ReturnType<PaneChatApi['createThread']>
      >),
    ),
    deleteThread: vi.fn(() => Promise.resolve()),
    renameThread: vi.fn(() => Promise.resolve()),
    getThread: vi.fn(() =>
      Promise.resolve({ id: THREAD_ID, messages: history } as Awaited<
        ReturnType<PaneChatApi['getThread']>
      >),
    ),
    addFileSource: vi.fn(),
    listSources: vi.fn(),
    run: vi.fn((input: PaneRunInput, _signal, onEvent) => {
      inputs.push(input);
      (runs.shift() ?? []).forEach((message) => onEvent(messageEvent(message)));
      return Promise.resolve();
    }),
  };
  return { api, inputs };
}

describe('usePaneChat', () => {
  beforeEach(() => {
    executeOutlookTool.mockReset();
  });

  it('posts the result of a read call back so the run continues with it', async () => {
    const readCall = { id: 'call-read', name: 'outlook__read_email' };
    executeOutlookTool.mockResolvedValue({
      status: 'result',
      result: '{"subject":"Bauantrag"}',
    });
    const { api, inputs } = fakeApi([
      [assistantCalling('a1', readCall)],
      [assistantText('a2', 'Es geht um den Bauantrag.')],
    ]);
    const { result } = renderHook(() =>
      usePaneChat({ api, onSessionExpired: vi.fn() }),
    );

    await act(() => result.current.send('Summarize this email.'));

    expect(executeOutlookTool).toHaveBeenCalledTimes(1);
    expect(inputs).toEqual([
      { threadId: THREAD_ID, text: 'Summarize this email.' },
      {
        threadId: THREAD_ID,
        toolResult: {
          toolId: 'call-read',
          toolName: 'outlook__read_email',
          result: '{"subject":"Bauantrag"}',
        },
      },
    ]);
    expect(result.current.messages.at(-1)?.id).toBe('a2');
  });

  it('executes a write call once and does not post its outcome', async () => {
    executeOutlookTool.mockResolvedValue({
      status: 'done',
      action: 'inserted',
    });
    const { api, inputs } = fakeApi([
      [
        assistantCalling('a1', {
          id: 'call-draft',
          name: 'outlook__draft_email',
          params: { body: 'Sehr geehrte Damen und Herren' },
        }),
      ],
    ]);
    const { result } = renderHook(() =>
      usePaneChat({ api, onSessionExpired: vi.fn() }),
    );

    await act(() => result.current.send('Draft a reply to this email.'));

    expect(executeOutlookTool).toHaveBeenCalledWith(
      'outlook__draft_email',
      { body: 'Sehr geehrte Damen und Herren' },
      expect.anything(),
    );
    expect(inputs).toHaveLength(1);
    expect(result.current.toolStates['call-draft']).toEqual({
      status: 'done',
      action: 'inserted',
    });
  });

  it('does not insert the drafts of a reopened chat into the open email again', async () => {
    const oldDraft = assistantCalling('a0', {
      id: 'call-old',
      name: 'outlook__draft_email',
      params: { body: 'alt' },
    });
    executeOutlookTool.mockResolvedValue({
      status: 'done',
      action: 'inserted',
    });
    const { api } = fakeApi([[assistantText('a1', 'Gern.')]], [oldDraft]);
    const { result } = renderHook(() =>
      usePaneChat({ api, onSessionExpired: vi.fn() }),
    );

    await act(() => result.current.openThread(THREAD_ID));
    await act(() => result.current.send('Danke'));

    expect(executeOutlookTool).not.toHaveBeenCalled();
  });

  it('leaves a call with invalid input to the backend', async () => {
    const { api } = fakeApi([
      [
        assistantCalling(
          'a1',
          { id: 'call-bad', name: 'outlook__draft_email' },
          { status: 'invalid', argumentsJson: '{}' },
        ),
      ],
    ]);
    const { result } = renderHook(() =>
      usePaneChat({ api, onSessionExpired: vi.fn() }),
    );

    await act(() => result.current.send('Entwirf etwas'));

    expect(executeOutlookTool).not.toHaveBeenCalled();
  });
  it('does not touch the open email while a sibling call awaits confirmation', async () => {
    executeOutlookTool.mockResolvedValue({
      status: 'done',
      action: 'inserted',
    });
    const { api, inputs } = fakeApi([
      [
        assistantCallingMany('a1', [
          {
            id: 'call-mcp',
            name: 'ratsinfo__search',
            requiresConfirmation: true,
          },
          {
            id: 'call-draft',
            name: 'outlook__draft_email',
            params: { body: 'Sehr geehrte Damen und Herren' },
          },
        ]),
      ],
    ]);
    const { result } = renderHook(() =>
      usePaneChat({ api, onSessionExpired: vi.fn() }),
    );

    await act(() => result.current.send('Draft a reply to this email.'));

    expect(executeOutlookTool).not.toHaveBeenCalled();
    expect(inputs).toHaveLength(1);
  });

  it('does not post a read result once the user stopped the run', async () => {
    let toolStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      toolStarted = resolve;
    });
    let release!: (outcome: { status: 'result'; result: string }) => void;
    const pending = new Promise<{ status: 'result'; result: string }>(
      (resolve) => {
        release = resolve;
      },
    );
    executeOutlookTool.mockImplementation(() => {
      toolStarted();
      return pending;
    });
    const { api, inputs } = fakeApi([
      [
        assistantCalling('a1', {
          id: 'call-read',
          name: 'outlook__read_email',
        }),
      ],
      [assistantText('a2', 'Es geht um den Bauantrag.')],
    ]);
    const { result } = renderHook(() =>
      usePaneChat({ api, onSessionExpired: vi.fn() }),
    );

    let sent!: Promise<void>;
    await act(async () => {
      sent = result.current.send('Summarize this email.');
      await started;
    });
    act(() => result.current.stop());
    await act(async () => {
      release({ status: 'result', result: '{"subject":"Bauantrag"}' });
      await sent;
    });

    expect(inputs).toHaveLength(1);
  });
  it('stops the loop when the pane unmounts mid-run', async () => {
    let toolStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      toolStarted = resolve;
    });
    let release!: (outcome: { status: 'result'; result: string }) => void;
    const pending = new Promise<{ status: 'result'; result: string }>(
      (resolve) => {
        release = resolve;
      },
    );
    executeOutlookTool.mockImplementation(() => {
      toolStarted();
      return pending;
    });
    const { api, inputs } = fakeApi([
      [
        assistantCalling('a1', {
          id: 'call-read',
          name: 'outlook__read_email',
        }),
      ],
      [assistantText('a2', 'Es geht um den Bauantrag.')],
    ]);
    const { result, unmount } = renderHook(() =>
      usePaneChat({ api, onSessionExpired: vi.fn() }),
    );

    let sent!: Promise<void>;
    await act(async () => {
      sent = result.current.send('Summarize this email.');
      await started;
    });
    unmount();
    await act(async () => {
      release({ status: 'result', result: '{"subject":"Bauantrag"}' });
      await sent;
    });

    expect(inputs).toHaveLength(1);
  });
});
