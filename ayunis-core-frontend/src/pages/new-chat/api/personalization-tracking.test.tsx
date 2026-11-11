import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGeneratePersonalizedSystemPrompt } from './useGeneratePersonalizedSystemPrompt';
import { useSkipPersonalization } from './useSkipPersonalization';

const { request, client } = vi.hoisted(() => ({
  request: vi.fn(),
  client: { track: vi.fn() },
}));

vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('@/shared/lib/openpanel', () => ({ openPanel: client }));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

async function generatePersonalizedPrompt() {
  const { result } = renderHook(() => useGeneratePersonalizedSystemPrompt(), {
    wrapper,
  });
  act(() =>
    result.current.generate({
      preferredName: 'Erika',
      workContext: 'Bauamt Musterstadt',
    }),
  );
  await waitFor(() => expect(request).toHaveBeenCalled());
  await waitFor(() => expect(result.current.isGenerating).toBe(false));
}

async function skipPersonalization() {
  const { result } = renderHook(() => useSkipPersonalization(), { wrapper });
  act(() => result.current.skip());
  await waitFor(() => expect(request).toHaveBeenCalled());
  await waitFor(() => expect(result.current.isSkipping).toBe(false));
}

beforeEach(() => {
  vi.resetAllMocks();
  client.track.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('personalization_saved', () => {
  it('sends state: completed without the answers or the prompt once the prompt was saved', async () => {
    request.mockResolvedValue({
      systemPrompt: 'Du sprichst mit Erika.',
      welcomeMessage: 'Hallo Erika',
    });

    await generatePersonalizedPrompt();

    expect(client.track.mock.calls).toEqual([
      ['personalization_saved', { state: 'completed' }],
    ]);
  });

  it('sends state: skipped once skipping was saved', async () => {
    request.mockResolvedValue({ systemPrompt: '-' });

    await skipPersonalization();

    expect(client.track.mock.calls).toEqual([
      ['personalization_saved', { state: 'skipped' }],
    ]);
  });

  it.each([
    ['generating', generatePersonalizedPrompt],
    ['skipping', skipPersonalization],
  ])('sends nothing when %s failed', async (_action, save) => {
    request.mockRejectedValue(new Error('save failed'));

    await save();

    expect(client.track).not.toHaveBeenCalled();
  });
});
