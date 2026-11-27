import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNewChatPinnedSkills } from './useNewChatPinnedSkills';

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@ayunis/api-client/request', () => ({
  customAxiosInstance: mocks.request,
}));

const personalSkills = {
  data: [
    { id: 'personal', name: 'Personal Skill', isPinned: true },
    { id: 'unpinned-personal', name: 'Unpinned', isPinned: false },
  ],
  pagination: { limit: 100, offset: 0, total: 2 },
};

function workspaceContext(workspaceId: string) {
  return {
    skills: [
      {
        id: `${workspaceId}-pin`,
        name: workspaceId,
        isActive: true,
        isPinned: true,
      },
      { id: 'inactive', name: 'Inactive', isActive: false, isPinned: true },
      { id: 'unpinned', name: 'Unpinned', isActive: true, isPinned: false },
    ],
  };
}

function renderPins(workspaceId: string | null) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(
    ({ id }: { id: string | null }) => useNewChatPinnedSkills(id),
    { wrapper, initialProps: { id: workspaceId } },
  );
}

beforeEach(() => {
  mocks.request.mockReset();
  mocks.request.mockImplementation(({ url }: { url: string }) => {
    const workspace = /^\/workspaces\/([^/]+)\/context$/.exec(url)?.[1];
    return Promise.resolve(
      workspace ? workspaceContext(workspace) : personalSkills,
    );
  });
});
afterEach(cleanup);

describe('useNewChatPinnedSkills', () => {
  it('offers the pinned personal skills and the active pins of the workspace', async () => {
    const { result } = renderPins('project-a');

    await waitFor(() =>
      expect(result.current.items).toEqual([
        { id: 'personal', name: 'Personal Skill' },
        { id: 'project-a-pin', name: 'project-a', workspaceId: 'project-a' },
      ]),
    );
    expect(result.current.status).toBe('ready');
  });

  it('replaces the workspace pins when the workspace changes and drops them when it is cleared', async () => {
    const { result, rerender } = renderPins('project-a');
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    rerender({ id: 'project-b' });
    await waitFor(() =>
      expect(result.current.items.map(({ id }) => id)).toEqual([
        'personal',
        'project-b-pin',
      ]),
    );

    rerender({ id: null });
    expect(result.current.items.map(({ id }) => id)).toEqual(['personal']);
  });

  it('does not load a workspace context without a selected workspace', async () => {
    const { result } = renderPins(null);
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    expect(mocks.request).toHaveBeenCalledOnce();
  });

  it('keeps the personal pins when the workspace pins cannot be loaded', async () => {
    mocks.request.mockImplementation(({ url }: { url: string }) =>
      url.includes('/context')
        ? Promise.reject(new Error('Unavailable'))
        : Promise.resolve(personalSkills),
    );
    const { result } = renderPins('project-a');

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.items).toEqual([
      { id: 'personal', name: 'Personal Skill' },
    ]);
  });
});
