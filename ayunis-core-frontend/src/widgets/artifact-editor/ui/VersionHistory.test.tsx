import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VersionHistory } from './VersionHistory';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const versions = [
  {
    id: 'version-2',
    artifactId: 'artifact-id',
    versionNumber: 2,
    content: 'current',
    authorType: 'USER' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'version-1',
    artifactId: 'artifact-id',
    versionNumber: 1,
    content: 'previous',
    authorType: 'USER' as const,
    createdAt: '2025-12-31T00:00:00.000Z',
  },
];

describe('VersionHistory', () => {
  it('does not nest the revert button inside a selectable version button', () => {
    const { container, getByRole } = render(
      <VersionHistory
        versions={versions}
        currentVersionNumber={2}
        selectedVersionNumber={1}
        onSelect={vi.fn()}
        onRevert={vi.fn()}
      />,
    );

    getByRole('button', { name: /versionHistory.title/ }).click();

    expect(container.querySelector('button button')).toBeNull();
  });

  it('renders selectable versions and revert buttons when not disabled', () => {
    const { getByRole, getAllByRole } = render(
      <VersionHistory
        versions={versions}
        currentVersionNumber={2}
        selectedVersionNumber={1}
        onSelect={vi.fn()}
        onRevert={vi.fn()}
      />,
    );

    fireEvent.click(getByRole('button', { name: /versionHistory.title/ }));

    expect(
      getAllByRole('button', { name: 'versionHistory.viewVersion' }),
    ).toHaveLength(2);
    expect(
      getAllByRole('button', { name: /versionHistory.revert/ }),
    ).toHaveLength(1);
  });

  it('applies the hover background to the whole row, not the inner button', () => {
    const { getByRole, getAllByRole } = render(
      <VersionHistory
        versions={versions}
        currentVersionNumber={2}
        selectedVersionNumber={1}
        onSelect={vi.fn()}
        onRevert={vi.fn()}
      />,
    );

    fireEvent.click(getByRole('button', { name: /versionHistory.title/ }));

    const versionButton = getAllByRole('button', {
      name: 'versionHistory.viewVersion',
    })[0];
    expect(versionButton.className).not.toMatch(/hover:bg-muted/);
    expect(versionButton.parentElement?.className).toMatch(/hover:bg-muted/);
  });

  it('makes the whole row clickable and keeps Revert acting only as revert', () => {
    const onSelect = vi.fn();
    const onRevert = vi.fn();
    const { getByRole, getAllByRole } = render(
      <VersionHistory
        versions={versions}
        currentVersionNumber={2}
        selectedVersionNumber={2}
        onSelect={onSelect}
        onRevert={onRevert}
      />,
    );

    fireEvent.click(getByRole('button', { name: /versionHistory.title/ }));

    // The select target fills the row rather than sitting beside the label,
    // so every part of the row responds to a click.
    const selectButtons = getAllByRole('button', {
      name: 'versionHistory.viewVersion',
    });
    expect(selectButtons[1].className).toMatch(/absolute/);
    expect(selectButtons[1].className).toMatch(/inset-0/);

    fireEvent.click(selectButtons[1]);
    expect(onSelect).toHaveBeenCalledWith(1);

    fireEvent.click(getByRole('button', { name: /versionHistory.revert/ }));
    expect(onRevert).toHaveBeenCalledWith(1);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('does not offer a hover background when rows are not selectable', () => {
    const { getByRole, getByText } = render(
      <VersionHistory
        versions={versions}
        currentVersionNumber={2}
        onRevert={vi.fn()}
      />,
    );

    fireEvent.click(getByRole('button', { name: /versionHistory.title/ }));

    const row = getByText('v1').closest('div');
    expect(row?.className).not.toMatch(/hover:bg-muted/);
  });

  it('disables selection and revert when disabled', () => {
    const { getByRole, queryAllByRole } = render(
      <VersionHistory
        versions={versions}
        currentVersionNumber={2}
        selectedVersionNumber={2}
        onSelect={vi.fn()}
        onRevert={vi.fn()}
        disabled
      />,
    );

    fireEvent.click(getByRole('button', { name: /versionHistory.title/ }));

    expect(
      queryAllByRole('button', { name: 'versionHistory.viewVersion' }),
    ).toHaveLength(0);
    expect(
      queryAllByRole('button', { name: /versionHistory.revert/ }),
    ).toHaveLength(0);
  });
});
