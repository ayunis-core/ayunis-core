import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrgNameItem from './OrgNameItem';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mocks = vi.hoisted(() => ({ updateOrgName: vi.fn() }));

vi.mock(
  '@/pages/super-admin-settings/org/api/useSuperAdminUpdateOrgName',
  () => ({
    default: () => ({
      updateOrgName: mocks.updateOrgName,
      isPending: false,
    }),
  }),
);

const org = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Acme Corporation',
  createdAt: '2026-08-30T10:00:00.000Z',
};

function startEditing() {
  render(<OrgNameItem org={org} />);
  fireEvent.click(screen.getByTestId('org-name-edit'));
  return screen.getByTestId<HTMLInputElement>('org-name-input');
}

describe('OrgNameItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the current name until editing starts', () => {
    render(<OrgNameItem org={org} />);

    expect(screen.getByTestId('org-name-value').textContent).toBe(
      'Acme Corporation',
    );
    expect(screen.queryByTestId('org-name-input')).toBeNull();
  });

  it('submits the trimmed new name', async () => {
    const input = startEditing();
    expect(input.value).toBe('Acme Corporation');

    fireEvent.change(input, { target: { value: '  Renamed Corporation  ' } });
    fireEvent.click(screen.getByTestId('org-name-save'));

    await vi.waitFor(() =>
      expect(mocks.updateOrgName).toHaveBeenCalledWith({
        name: 'Renamed Corporation',
      }),
    );
  });

  it('rejects a blank name without calling the API', async () => {
    const input = startEditing();

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('org-name-save'));

    expect(
      await screen.findByText('orgDetails.validation.name.isNotEmpty'),
    ).toBeTruthy();
    expect(mocks.updateOrgName).not.toHaveBeenCalled();
  });

  it('restores the current name when editing is cancelled', () => {
    const input = startEditing();
    fireEvent.change(input, { target: { value: 'Discarded' } });

    fireEvent.click(screen.getByTestId('org-name-cancel'));

    expect(screen.getByTestId('org-name-value').textContent).toBe(
      'Acme Corporation',
    );
  });
});
