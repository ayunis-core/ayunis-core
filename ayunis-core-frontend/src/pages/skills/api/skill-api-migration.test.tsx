import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useSetSkillActivation,
  useSetSkillPin,
} from '@/features/skill-actions';
import { useCreateSkill } from './useCreateSkill';

const { request, navigate, invalidate } = vi.hoisted(() => ({
  request: vi.fn(),
  navigate: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate, navigate }),
  useNavigate: () => navigate,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

beforeEach(() => {
  vi.resetAllMocks();
  navigate.mockResolvedValue(undefined);
  invalidate.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('personal skill API migration', () => {
  it('creates skills with an explicit personal owner scope', async () => {
    request.mockResolvedValue({ id: 'skill' });
    const { wrapper } = setup();
    const { result } = renderHook(() => useCreateSkill(), { wrapper });

    await act(() =>
      result.current.createSkill({
        name: 'Permit review',
        shortDescription: 'Reviews permits',
        instructions: 'Review the permit.',
      }),
    );

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/skills',
        method: 'POST',
        data: {
          ownerType: 'personal',
          name: 'Permit review',
          shortDescription: 'Reviews permits',
          instructions: 'Review the permit.',
        },
      }),
    );
  });

  it('sends the desired personal activation and pin states', async () => {
    request.mockResolvedValue({ id: 'skill' });
    const { wrapper } = setup();
    const activation = renderHook(() => useSetSkillActivation(), { wrapper });
    const pin = renderHook(() => useSetSkillPin(), { wrapper });

    act(() => {
      activation.result.current.mutate({ id: 'skill', isActive: false });
      pin.result.current.mutate({ id: 'skill', isPinned: true });
    });

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/skills/skill/activation',
        method: 'PATCH',
        data: { isActive: false },
      }),
    );
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/skills/skill/pin',
        method: 'PATCH',
        data: { isPinned: true },
      }),
    );
  });
});
