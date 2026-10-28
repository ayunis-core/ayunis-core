import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PiiCategory, type PiiMaskResponseDto } from '@/shared/api';
import type { Message, Thread } from '@/pages/chat/model/openapi';
import { useChatThreadState } from './useChatThreadState';

const maskedEntry: PiiMaskResponseDto = {
  id: 'mask-id',
  token: '{{pii:PERSON_NAME_1}}',
  value: 'Erika Mustermann',
  category: PiiCategory.person_name,
  unmasked: false,
};

function message(id: string, text: string): Message {
  return {
    id,
    role: 'assistant',
    content: [{ type: 'text', text }],
  } as unknown as Message;
}

function thread(messages: Message[], piiMasks: PiiMaskResponseDto[]): Thread {
  return {
    id: 'thread-id',
    title: 'Bürgeranfrage',
    messages,
    piiMasks,
  } as unknown as Thread;
}

describe(useChatThreadState.name, () => {
  it('keeps local chat state when only cached masks change', () => {
    const persistedMessage = message('assistant-id', 'Persistierte Antwort');
    const currentThread = thread([persistedMessage], [maskedEntry]);
    const localMessage = message('assistant-id', 'Lokale Antwort');
    const { result, rerender } = renderHook(
      ({ value }) => useChatThreadState(value, false),
      { initialProps: { value: currentThread } },
    );
    act(() => {
      result.current.setMessages([localMessage]);
      result.current.setThreadTitle('Generierter Titel');
    });

    rerender({
      value: {
        ...currentThread,
        piiMasks: [{ ...maskedEntry, unmasked: true }],
      },
    });

    expect(result.current.messages).toEqual([localMessage]);
    expect(result.current.threadTitle).toBe('Generierter Titel');
    expect(result.current.piiMasks).toEqual([
      { ...maskedEntry, unmasked: true },
    ]);
  });

  it('keeps streaming messages and unmasked terms across stale thread updates', () => {
    const persistedMessage = message('assistant-id', 'Kurze Antwort');
    const streamedMessage = message(
      'assistant-id',
      'Eine längere, noch gestreamte Antwort',
    );
    const currentThread = thread(
      [persistedMessage],
      [{ ...maskedEntry, unmasked: true }],
    );
    const { result, rerender } = renderHook(
      ({ value, isStreaming }) => useChatThreadState(value, isStreaming),
      { initialProps: { value: currentThread, isStreaming: true } },
    );
    act(() => result.current.setMessages([streamedMessage]));

    rerender({
      value: thread([persistedMessage], [maskedEntry]),
      isStreaming: true,
    });

    expect(result.current.messages).toEqual([streamedMessage]);
    expect(result.current.piiMasks).toEqual([
      { ...maskedEntry, unmasked: true },
    ]);
  });
});
