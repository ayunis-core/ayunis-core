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
});
