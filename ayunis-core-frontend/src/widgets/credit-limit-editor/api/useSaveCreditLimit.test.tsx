import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { useSaveCreditLimit } from './useSaveCreditLimit';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { CreditLimitFields } from '@/widgets/credit-limit-editor/model/types';

const api = vi.hoisted(() => ({
  setTeam: vi.fn(),
  setUser: vi.fn(),
  removeTeam: vi.fn(),
  removeUser: vi.fn(),
}));
vi.mock('@/shared/api', () => ({
  creditLimitsControllerSetTeamLimit: api.setTeam,
  creditLimitsControllerSetUserLimit: api.setUser,
  creditLimitsControllerRemoveTeamLimit: api.removeTeam,
  creditLimitsControllerRemoveUserLimit: api.removeUser,
  getCreditLimitsControllerGetTeamLimitsQueryKey: () => ['team-limits'],
  getCreditLimitsControllerGetUserLimitsQueryKey: () => ['user-limits'],
}));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function wrapper({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  );
}

describe('useSaveCreditLimit', () => {
  beforeEach(() => vi.resetAllMocks());
  it.each(['teams', 'users'] as const)(
    'persists zero and removes only the %s ceiling',
    async (target) => {
      const state = new Map<string, number>();
      const set = target === 'teams' ? api.setTeam : api.setUser;
      const remove = target === 'teams' ? api.removeTeam : api.removeUser;
      set.mockImplementation(
        async (id: string, data: { monthlyCredits: number }) =>
          state.set(id, data.monthlyCredits),
      );
      remove.mockImplementation(async (id: string) => state.delete(id));
      const { result } = renderHook(
        () => ({
          mutation: useSaveCreditLimit(target, 'target', true),
          form: useForm<CreditLimitFields>(),
        }),
        { wrapper },
      );
      await act(async () => {
        await result.current.mutation.onSave(0, result.current.form);
      });
      expect(state.get('target')).toBe(0);
      expect(showSuccess).toHaveBeenLastCalledWith('creditLimits.set.success');
      await act(async () => {
        await result.current.mutation.onSave(null, result.current.form);
      });
      expect(state.has('target')).toBe(false);
      expect(showSuccess).toHaveBeenLastCalledWith(
        'creditLimits.remove.success',
      );
      expect(
        target === 'teams' ? api.setUser : api.setTeam,
      ).not.toHaveBeenCalled();
    },
  );
  it.each([
    {
      value: null,
      error: new AxiosError('Unavailable'),
      message: 'creditLimits.remove.error',
      kind: 'Axios removal',
    },
    {
      value: null,
      error: new Error('Offline'),
      message: 'creditLimits.remove.error',
      kind: 'non-Axios removal',
    },
    {
      value: 0,
      error: new AxiosError('Unavailable'),
      message: 'creditLimits.set.error',
      kind: 'Axios save',
    },
    {
      value: 0,
      error: new Error('Offline'),
      message: 'creditLimits.set.error',
      kind: 'non-Axios save',
    },
  ])(
    'reports the current operation on $kind failure',
    async ({ value, error, message }) => {
      (value === null ? api.removeUser : api.setUser).mockRejectedValue(error);
      const { result } = renderHook(
        () => ({
          mutation: useSaveCreditLimit('users', 'target', true),
          form: useForm<CreditLimitFields>(),
        }),
        { wrapper },
      );
      let saved = true;
      await act(async () => {
        saved = await result.current.mutation.onSave(
          value,
          result.current.form,
        );
      });
      expect(saved).toBe(false);
      expect(showError).toHaveBeenCalledWith(message);
      expect(showSuccess).not.toHaveBeenCalled();
    },
  );
  it('leaves a missing ceiling absent without issuing a failing DELETE', async () => {
    const { result } = renderHook(
      () => ({
        mutation: useSaveCreditLimit('users', 'target', false),
        form: useForm<CreditLimitFields>(),
      }),
      { wrapper },
    );
    let saved = false;
    await act(async () => {
      saved = await result.current.mutation.onSave(null, result.current.form);
    });
    expect(saved).toBe(true);
    expect(api.removeUser).not.toHaveBeenCalled();
  });
  it('maps a rejected backend amount to the form field and keeps the form open', async () => {
    const error = new AxiosError('Invalid');
    error.response = {
      data: { code: 'INVALID_CREDIT_LIMIT', message: 'Invalid amount' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: {} },
    } as typeof error.response;
    api.setUser.mockRejectedValue(error);
    const { result } = renderHook(
      () => ({
        mutation: useSaveCreditLimit('users', 'target', true),
        form: useForm<CreditLimitFields>(),
      }),
      { wrapper },
    );
    let saved = true;
    await act(async () => {
      saved = await result.current.mutation.onSave(3, result.current.form);
    });
    expect(saved).toBe(false);
    expect(
      result.current.form.getFieldState('monthlyCredits').error?.message,
    ).toBe('validation.monthlyCredits.invalid');
  });
});
