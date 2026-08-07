import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RunErrorResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useRunErrorHandler } from './useRunErrorHandler';

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/shared/lib/toast', () => ({ showError }));

describe('useRunErrorHandler', () => {
  it('shows the context-budget explanation for an oversized latest turn', () => {
    const { result } = renderHook(() => useRunErrorHandler('thread-1'));
    const error: RunErrorResponseDto = {
      type: 'error',
      message: 'The latest conversation turn is too large.',
      threadId: 'thread-1',
      timestamp: '2026-07-31T18:00:00.000Z',
      code: 'RUN_CONTEXT_BUDGET_EXCEEDED',
    };

    act(() => result.current(error));

    expect(showError).toHaveBeenCalledWith('chat.errorContextBudgetExceeded');
  });

  it('shows the tool-failure explanation when the repeated-failure breaker aborts the run', () => {
    const { result } = renderHook(() => useRunErrorHandler('thread-1'));
    const error: RunErrorResponseDto = {
      type: 'error',
      message: "Tool 'generate_image' execution failed",
      threadId: 'thread-1',
      timestamp: '2026-08-06T12:00:00.000Z',
      code: 'RUN_TOOL_EXECUTION_FAILED',
    };

    act(() => result.current(error));

    expect(showError).toHaveBeenCalledWith('chat.errorToolExecutionFailed');
  });

  it('shows the timeout explanation when the provider stream stalls', () => {
    const { result } = renderHook(() => useRunErrorHandler('thread-1'));
    const error: RunErrorResponseDto = {
      type: 'error',
      message: 'Model stream produced no data for 180000ms',
      threadId: 'thread-1',
      timestamp: '2026-08-05T11:00:00.000Z',
      code: 'INFERENCE_TIMEOUT',
    };

    act(() => result.current(error));

    expect(showError).toHaveBeenCalledWith('chat.errorInferenceTimeout');
  });
});
