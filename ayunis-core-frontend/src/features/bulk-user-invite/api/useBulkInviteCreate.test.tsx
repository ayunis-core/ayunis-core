import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { showError } from '@/shared/lib/toast';
import en from '@/shared/locales/en/admin-settings-users.json';
import de from '@/shared/locales/de/admin-settings-users.json';
import { useBulkInviteCreate } from './useBulkInviteCreate';

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/shared/api/generated/ayunisCoreAPI', async () => {
  const { useMutation } = await import('@tanstack/react-query');
  const useCreate = (options: { mutation: Record<string, unknown> }) =>
    useMutation({ mutationFn: mocks.request, ...options.mutation });
  return {
    getInvitesControllerGetInvitesQueryKey: () => ['invites'],
    getSuperAdminInvitesControllerGetInvitesQueryKey: () => ['super-invites'],
    getSuperAdminUsersControllerGetUsersByOrgIdQueryKey: () => ['users'],
    useInvitesControllerCreateBulk: useCreate,
    useSuperAdminInvitesControllerCreateBulk: useCreate,
  };
});
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function setup(language: string, orgId?: string) {
  const i18n = createInstance();
  await i18n.init({
    lng: language,
    resources: {
      en: { 'admin-settings-users': en },
      de: { 'admin-settings-users': de },
    },
  });
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const onError = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </I18nextProvider>
  );
  const hook = renderHook(
    () => useBulkInviteCreate(orgId, undefined, onError),
    {
      wrapper,
    },
  );
  return { ...hook, onError };
}

function apiError(code: string, metadata?: Record<string, unknown>) {
  return new AxiosError('Request failed', undefined, undefined, undefined, {
    data: { code, metadata },
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

const invites = [
  { email: 'test@ayunis.com', role: 'user' as const, teamNames: ['KITA'] },
];

for (const orgId of [undefined, 'target-org']) {
  describe(orgId ? 'super admin bulk import' : 'org admin bulk import', () => {
    it.each(['en', 'de'])(
      'explains subscription overlap in %s and restores preview',
      async (language) => {
        mocks.request.mockRejectedValue(
          apiError('MULTIPLE_ACTIVE_SUBSCRIPTIONS'),
        );
        const { result, onError } = await setup(language, orgId);
        act(() => result.current.createBulkInvites(invites));
        await waitFor(() => expect(onError).toHaveBeenCalledWith([]));
        const translations = language === 'de' ? de : en;
        expect(showError).toHaveBeenCalledWith(
          translations.inviteCreate.multipleActiveSubscriptions,
        );
      },
    );

    it('preserves row validation errors', async () => {
      const errors = [
        {
          row: 1,
          email: invites[0].email,
          errorCode: 'TEAM_NOT_FOUND',
          message: 'Unknown team: KITA',
        },
      ];
      mocks.request.mockRejectedValue(
        apiError('BULK_INVITE_VALIDATION_FAILED', { errors }),
      );
      const { result, onError } = await setup('en', orgId);
      act(() => result.current.createBulkInvites(invites));
      await waitFor(() => expect(onError).toHaveBeenCalledWith(errors));
      expect(showError).toHaveBeenCalledWith(en.bulkInvite.validationFailed);
    });

    it.each([new Error('Network unavailable'), apiError('UNEXPECTED_ERROR')])(
      'keeps a fallback for unknown errors',
      async (error) => {
        mocks.request.mockRejectedValue(error);
        const { result, onError } = await setup('en', orgId);
        act(() => result.current.createBulkInvites(invites));
        await waitFor(() => expect(onError).toHaveBeenCalledWith([]));
        expect(showError).toHaveBeenCalledWith(en.bulkInvite.error);
      },
    );
  });
}
