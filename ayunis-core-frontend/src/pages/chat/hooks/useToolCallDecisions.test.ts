import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '@/pages/chat/model/openapi';
import { useToolCallDecisions } from './useToolCallDecisions';

function pausedTurn(...toolCallIds: string[]): Message[] {
  return [
    {
      id: 'assistant-1',
      role: 'assistant',
      createdAt: '2026-11-11T09:00:00.000Z',
      content: toolCallIds.map((id) => ({
        type: 'tool_use',
        id,
        name: 'mcp__tool__create_ticket__b0eb63cb',
        params: { title: 'Laterne defekt' },
        requiresConfirmation: true,
      })),
    },
  ] as unknown as Message[];
}

describe(useToolCallDecisions.name, () => {
  it('sends the decisions of a turn only once every call of it is decided', () => {
    const sendDecisions = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useToolCallDecisions({
        messages: pausedTurn('call-1', 'call-2'),
        isStreaming: false,
        sendDecisions,
      }),
    );

    act(() =>
      result.current.decide({
        toolCallId: 'call-2',
        approved: false,
        alwaysAllow: false,
      }),
    );
    expect(sendDecisions).not.toHaveBeenCalled();

    act(() =>
      result.current.decide({
        toolCallId: 'call-1',
        approved: true,
        alwaysAllow: true,
      }),
    );
    expect(sendDecisions).toHaveBeenCalledExactlyOnceWith([
      { toolCallId: 'call-1', approved: true, alwaysAllow: true },
      { toolCallId: 'call-2', approved: false, alwaysAllow: false },
    ]);
  });

  it('sends the decisions of a turn once when the user decides again before the chat re-renders', () => {
    const sendDecisions = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useToolCallDecisions({
        messages: pausedTurn('call-1', 'call-2'),
        isStreaming: false,
        sendDecisions,
      }),
    );

    act(() => {
      const { decide } = result.current;
      decide({ toolCallId: 'call-1', approved: true, alwaysAllow: false });
      decide({ toolCallId: 'call-2', approved: false, alwaysAllow: false });
      decide({ toolCallId: 'call-2', approved: false, alwaysAllow: false });
    });

    expect(sendDecisions).toHaveBeenCalledExactlyOnceWith([
      { toolCallId: 'call-1', approved: true, alwaysAllow: false },
      { toolCallId: 'call-2', approved: false, alwaysAllow: false },
    ]);
  });

  it('lets the user decide again when sending the decisions failed', async () => {
    const sendDecisions = vi.fn().mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() =>
      useToolCallDecisions({
        messages: pausedTurn('call-1'),
        isStreaming: false,
        sendDecisions,
      }),
    );

    await act(async () => {
      result.current.decide({
        toolCallId: 'call-1',
        approved: true,
        alwaysAllow: false,
      });
      await Promise.resolve();
    });

    expect(result.current.decisionFor('call-1')).toBeUndefined();
  });

  it('takes no decision while a run is active on the thread', () => {
    const sendDecisions = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useToolCallDecisions({
        messages: pausedTurn('call-1'),
        isStreaming: true,
        sendDecisions,
      }),
    );

    act(() =>
      result.current.decide({
        toolCallId: 'call-1',
        approved: true,
        alwaysAllow: false,
      }),
    );

    expect(sendDecisions).not.toHaveBeenCalled();
    expect(result.current.canDecide).toBe(false);
  });

  it('drops unsent decisions once the user sends a message instead', () => {
    const sendDecisions = vi.fn().mockResolvedValue(undefined);
    const messages = pausedTurn('call-1', 'call-2');
    const { result, rerender } = renderHook(
      ({ isStreaming }) =>
        useToolCallDecisions({ messages, isStreaming, sendDecisions }),
      { initialProps: { isStreaming: false } },
    );
    act(() =>
      result.current.decide({
        toolCallId: 'call-1',
        approved: true,
        alwaysAllow: false,
      }),
    );

    rerender({ isStreaming: true });

    expect(result.current.decisionFor('call-1')).toBeUndefined();
    expect(sendDecisions).not.toHaveBeenCalled();
  });
});
