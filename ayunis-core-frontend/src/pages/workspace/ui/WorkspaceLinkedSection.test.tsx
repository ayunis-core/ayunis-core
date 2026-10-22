import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceLinkedSection } from './WorkspaceLinkedSection';

const mocks = vi.hoisted(() => ({
  linked: { items: [] as unknown[], isLoading: false },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock('@/widgets/confirmation-modal', () => ({
  useConfirmation: () => ({ confirm: vi.fn() }),
}));
vi.mock('@/features/workspace-links', () => ({
  OwnerMeta: () => null,
  useLinkedItems: () => mocks.linked,
  useUnlinkItem: () => ({ mutate: vi.fn(), isPending: false }),
}));

const workspace = { id: 'workspace-1', name: 'Bauamt' };

afterEach(() => {
  cleanup();
  mocks.linked = { items: [], isLoading: false };
});

describe('WorkspaceLinkedSection', () => {
  it('shows a loading state instead of an empty list while links load', () => {
    mocks.linked = { items: [], isLoading: true };
    render(<WorkspaceLinkedSection kind="skill" workspace={workspace} />);

    expect(screen.getByTestId('workspace-linked-skill-loading')).toBeTruthy();
    expect(screen.queryByText('links.skills.emptyLinkedTitle')).toBeNull();
    expect(
      screen.getByTestId('workspace-linked-skill').querySelector('h2')
        ?.textContent,
    ).toBe('links.sections.linked');
  });

  it('shows the empty hint and the count once nothing is linked', () => {
    render(<WorkspaceLinkedSection kind="skill" workspace={workspace} />);

    expect(screen.queryByTestId('workspace-linked-skill-loading')).toBeNull();
    expect(screen.getByText('links.skills.emptyLinkedTitle')).toBeTruthy();
    expect(
      screen.getByTestId('workspace-linked-skill').querySelector('h2')
        ?.textContent,
    ).toBe('links.sections.linked0');
  });
});
