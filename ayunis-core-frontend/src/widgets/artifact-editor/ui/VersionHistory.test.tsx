import { render } from '@testing-library/react';
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
});
