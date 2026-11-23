import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmationProvider } from '@/widgets/confirmation-modal';
import MemorySettingsPage from './MemorySettingsPage';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@ayunis/api-client/request', () => ({ customAxiosInstance: request }));
vi.mock('@/pages/settings/settings-layout', () => ({
  SettingsLayout: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

afterEach(() => {
  cleanup();
  client.clear();
});

const emptyPersonal = {
  key: 'personal',
  content: '',
  description: null,
  isReserved: true,
  updatedAt: null,
};
const preferences = {
  key: 'preferences',
  content: 'Prefers short answers',
  description: null,
  isReserved: true,
  updatedAt: '2026-11-01T10:00:00.000Z',
};

describe('MemorySettingsPage', () => {
  it('discards an open draft on an empty entry when all memory is deleted, so saving cannot write it back', async () => {
    const cleared = [
      emptyPersonal,
      { ...preferences, content: '', updatedAt: null },
    ];
    request
      .mockResolvedValueOnce({ entries: [emptyPersonal, preferences] })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValue({ entries: cleared });
    render(
      <QueryClientProvider client={client}>
        <ConfirmationProvider>
          <MemorySettingsPage />
        </ConfirmationProvider>
      </QueryClientProvider>,
    );
    const personalCard = await screen.findByTestId('memory-entry-personal');

    fireEvent.click(
      personalCard.querySelector('[data-testid="memory-entry-edit"]')!,
    );
    fireEvent.change(screen.getByTestId('memory-entry-input'), {
      target: { value: 'Works in the building authority' },
    });
    fireEvent.click(screen.getByText('memory.clearAll'));
    await act(async () => {
      fireEvent.click(await screen.findByText('memory.confirmClear.confirm'));
    });

    await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    expect(screen.queryByTestId('memory-entry-input')).toBeNull();
  });
});
