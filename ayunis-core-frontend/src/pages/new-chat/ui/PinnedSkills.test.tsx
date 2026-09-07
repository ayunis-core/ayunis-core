import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PinnedSkills } from './PinnedSkills';

const mocks = vi.hoisted(() => ({ request: vi.fn(), enabled: true }));
vi.mock('@/shared/api/client', () => ({ customAxiosInstance: mocks.request }));
vi.mock('@/features/feature-toggles', () => ({
  useIsSkillsEnabled: () => mocks.enabled,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/ui/help-link/HelpLink', () => ({
  HelpLink: () => <span>Help</span>,
}));

function setup(workspaceId?: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onSelect = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return {
    onSelect,
    ...render(
      <PinnedSkills workspaceId={workspaceId} onSkillSelect={onSelect} />,
      { wrapper },
    ),
  };
}

beforeEach(() => {
  mocks.enabled = true;
  mocks.request.mockReset();
  mocks.request.mockImplementation(({ url }: { url: string }) =>
    Promise.resolve(
      url.includes('/context')
        ? {
            skills: [
              {
                workspaceId: url.includes('project-b')
                  ? 'project-b'
                  : 'project-a',
                id: url.includes('project-b') ? 'b' : 'a',
                name: url.includes('project-b') ? 'Project B' : 'Project A',
                isActive: true,
                isPinned: true,
              },
              {
                id: 'inactive',
                name: 'Inactive',
                isActive: false,
                isPinned: true,
              },
              {
                id: 'unpinned',
                name: 'Unpinned',
                isActive: true,
                isPinned: false,
              },
            ],
          }
        : [{ id: 'personal', name: 'Personal Skill', isPinned: true }],
    ),
  );
});
afterEach(cleanup);

describe('PinnedSkills project context', () => {
  it('uses identical selection controls for personal and project pins', async () => {
    const { onSelect } = setup('project-a');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Personal Skill' }),
    );
    expect(onSelect).toHaveBeenCalledWith(
      'personal',
      'Personal Skill',
      undefined,
    );
    const chip = await screen.findByRole('button', { name: 'Project A' });
    fireEvent.click(chip);
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenLastCalledWith('a', 'Project A', 'project-a');
    expect(chip.className).toBe(
      screen.getByRole('button', { name: 'Personal Skill' }).className,
    );
    expect(screen.queryByText('Inactive')).toBeNull();
    expect(screen.queryByText('Unpinned')).toBeNull();
  });

  it('replaces project pins on project change and removes them when cleared', async () => {
    const { rerender, onSelect } = setup('project-a');
    await screen.findByTestId('pinned-skill-a');
    rerender(<PinnedSkills workspaceId="project-b" onSkillSelect={onSelect} />);
    expect(screen.queryByTestId('pinned-skill-a')).toBeNull();
    await screen.findByTestId('pinned-skill-b');
    rerender(<PinnedSkills onSkillSelect={onSelect} />);
    expect(screen.queryByTestId('pinned-skill-b')).toBeNull();
    expect(screen.getByRole('button', { name: 'Personal Skill' })).toBeTruthy();
  });

  it('does not fetch workspace context without a selected project', async () => {
    setup();
    await screen.findByRole('button', { name: 'Personal Skill' });
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });

  it('preserves personal pins if project loading fails', async () => {
    mocks.request.mockImplementation(({ url }: { url: string }) =>
      url.includes('/context')
        ? Promise.reject(new Error('Unavailable'))
        : Promise.resolve([
            { id: 'personal', name: 'Personal Skill', isPinned: true },
          ]),
    );
    setup('project-a');
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Personal Skill' })).toBeTruthy();
  });

  it('does not fetch or render skills when the feature is disabled', async () => {
    mocks.enabled = false;
    const { container } = setup('project-a');
    await waitFor(() => expect(mocks.request).not.toHaveBeenCalled());
    expect(container.innerHTML).toBe('');
  });
});
