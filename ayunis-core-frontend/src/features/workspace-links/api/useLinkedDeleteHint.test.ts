import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLinkedWorkspaces } from './useLinkedWorkspaces';
import { useLinkedDeleteHint } from './useLinkedDeleteHint';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { count?: number }) => `${key}:${values?.count}`,
  }),
}));

vi.mock('./useLinkedWorkspaces', () => ({
  useLinkedWorkspaces: vi.fn(),
}));

const linkedWorkspaces = vi.mocked(useLinkedWorkspaces);

describe('useLinkedDeleteHint', () => {
  it('reports the links as unknown while loading or after a failed load', () => {
    linkedWorkspaces.mockReturnValue({
      total: 0,
      workspaces: [],
      isKnown: false,
    });

    const { result } = renderHook(() =>
      useLinkedDeleteHint('skill', 'skill-1', true),
    );

    expect(result.current).toEqual({ hint: '', isKnown: false });
  });

  it('names how many workspaces the item is linked into', () => {
    linkedWorkspaces.mockReturnValue({
      total: 2,
      workspaces: [],
      isKnown: true,
    });

    const { result } = renderHook(() =>
      useLinkedDeleteHint('knowledgeBase', 'kb-1', true),
    );

    expect(result.current).toEqual({
      hint: ' links.deleteHint:2',
      isKnown: true,
    });
  });
});
