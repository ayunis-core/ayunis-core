import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { skillsControllerImproveText } from '@/shared/api/generated/ayunisCoreAPI';
import { useImproveSkillText } from './useImproveSkillText';

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  skillsControllerImproveText: vi
    .fn()
    .mockResolvedValue({ text: 'Rewritten skill' }),
}));
vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useImproveSkillText language', () => {
  it('uses the current UI language for successive attempts without remounting', async () => {
    const i18n = createInstance();
    await i18n.init({
      lng: 'en',
      fallbackLng: 'en',
      resources: {
        en: { skills: { title: 'Skills' } },
        de: { skills: { title: 'Fähigkeiten' } },
      },
    });
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </I18nextProvider>
    );
    const { result } = renderHook(() => useImproveSkillText(), { wrapper });
    const draft = {
      field: 'trigger' as const,
      trigger: 'asdkfj qwpoeir zxcv',
      instructions: '',
    };

    for (const language of ['en', 'de', 'en']) {
      await act(async () => {
        await i18n.changeLanguage(language);
      });
      await act(async () => {
        await result.current.mutateAsync(draft);
      });
      expect(skillsControllerImproveText).toHaveBeenLastCalledWith({
        ...draft,
        language,
      });
    }
  });
});
