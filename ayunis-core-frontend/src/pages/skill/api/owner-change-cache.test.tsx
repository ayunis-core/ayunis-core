import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChangeKnowledgeBaseOwner } from '@/pages/knowledge-base/api';
import { useChangeSkillOwner } from './useChangeSkillOwner';

const { changeSkillOwner, changeKnowledgeBaseOwner } = vi.hoisted(() => ({
  changeSkillOwner: vi.fn(),
  changeKnowledgeBaseOwner: vi.fn(),
}));

vi.mock('@/shared/api/generated/ayunisCoreAPI', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  skillsControllerChangeOwner: changeSkillOwner,
  knowledgeBaseOwnerControllerChangeOwner: changeKnowledgeBaseOwner,
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

const assignedKnowledgeBases = (skillId: string) => [
  `/skills/${skillId}/knowledge-bases`,
];

function setup<T>(useHook: () => T) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  for (const skillId of ['moved-skill', 'other-skill']) {
    client.setQueryData(assignedKnowledgeBases(skillId), []);
  }
  const { result } = renderHook(useHook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  const isInvalidated = (skillId: string) =>
    client.getQueryState(assignedKnowledgeBases(skillId))?.isInvalidated;
  return { result, isInvalidated };
}

describe('owner changes refresh the knowledge bases assigned to skills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    changeSkillOwner.mockResolvedValue({});
    changeKnowledgeBaseOwner.mockResolvedValue({});
  });

  it('refreshes the moved skill', async () => {
    const { result, isInvalidated } = setup(() =>
      useChangeSkillOwner('moved-skill'),
    );

    await act(() => result.current.changeOwner({ ownerType: 'org' }));

    expect(isInvalidated('moved-skill')).toBe(true);
    expect(isInvalidated('other-skill')).toBe(false);
  });

  it('refreshes every skill when a knowledge base moves', async () => {
    const { result, isInvalidated } = setup(() =>
      useChangeKnowledgeBaseOwner('knowledge-base'),
    );

    await act(() => result.current.changeOwner({ ownerType: 'org' }));

    expect(isInvalidated('moved-skill')).toBe(true);
    expect(isInvalidated('other-skill')).toBe(true);
  });
});
