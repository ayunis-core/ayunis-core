import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useThreadSourceCitationsControllerGetSourceCitation } from '@/shared/api/generated/ayunisCoreAPI';
import { useSourceCitation } from './useSourceCitation';

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useThreadSourceCitationsControllerGetSourceCitation: vi.fn(),
}));

const threadId = '00000000-0000-0000-0000-000000000001';
const chunkId = '123e4567-e89b-12d3-a456-426614174000';
const citation = {
  chunk: { id: chunkId, content: 'Excerpt', startLine: 2, endLine: 4 },
  source: { id: 'source-1', name: 'Source', url: null },
};

describe('useSourceCitation', () => {
  it('maps the generated query result without showing read-error toasts', () => {
    vi.mocked(
      useThreadSourceCitationsControllerGetSourceCitation,
    ).mockReturnValue({
      data: citation,
      isLoading: false,
      error: null,
    } as ReturnType<
      typeof useThreadSourceCitationsControllerGetSourceCitation
    >);

    const { result } = renderHook(() => useSourceCitation(threadId, chunkId));

    expect(
      useThreadSourceCitationsControllerGetSourceCitation,
    ).toHaveBeenCalledWith(threadId, chunkId);
    expect(result.current).toEqual({
      citation,
      isLoading: false,
      error: null,
    });
  });
});
