import type { ReactNode } from 'react';
import { AxiosError } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showError } from '@/shared/lib/toast';
import { useCreateSkill } from './useCreateSkill';

const { request, navigate, invalidate, client } = vi.hoisted(() => ({
  request: vi.fn(),
  navigate: vi.fn(),
  invalidate: vi.fn(),
  client: { track: vi.fn() },
}));

vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('@/shared/lib/openpanel', () => ({ openPanel: client }));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate, navigate }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function conflict(code: string) {
  const error = new AxiosError('Conflict');
  error.response = {
    data: { code, message: 'Conflict' },
    status: 409,
    statusText: 'Conflict',
    headers: {},
    config: { headers: {} },
  } as typeof error.response;
  return error;
}

async function createFailingWith(error: unknown) {
  request.mockRejectedValue(error);
  await create();
}

async function create() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useCreateSkill(), { wrapper });
  await act(() =>
    result.current
      .createSkill({
        name: 'Design System',
        shortDescription: 'Bei Designfragen',
        instructions: 'Hilf beim Design.',
      })
      .catch(() => undefined),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  invalidate.mockResolvedValue(undefined);
  client.track.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('useCreateSkill', () => {
  it('says the name is taken when a skill with it already exists', async () => {
    await createFailingWith(conflict('DUPLICATE_SKILL_NAME'));

    expect(showError).toHaveBeenCalledWith('create.duplicateNamePersonal');
  });

  it('falls back to the general message for other failures', async () => {
    await createFailingWith(conflict('SOMETHING_ELSE'));

    expect(showError).toHaveBeenCalledWith('create.error');
    expect(client.track).not.toHaveBeenCalled();
  });

  it('sends skill_created without the skill name once the skill was created', async () => {
    request.mockResolvedValue({ id: 'skill-1' });

    await create();

    expect(client.track.mock.calls).toEqual([['skill_created', undefined]]);
  });
});
