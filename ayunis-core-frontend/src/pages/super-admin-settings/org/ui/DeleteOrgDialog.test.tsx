import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeleteOrgDialog from './DeleteOrgDialog';
const mocks = vi.hoisted(() => ({ deleteOrg: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({ values }: { values: { name: string } }) => values.name,
}));
vi.mock('@/pages/super-admin-settings/org/api/useDeleteOrg', () => ({
  useDeleteOrg: () => ({ mutate: mocks.deleteOrg, isPending: false }),
}));
describe('DeleteOrgDialog', () => {
  it('requires the exact current name before irreversible deletion', async () => {
    render(
      <DeleteOrgDialog
        org={{
          id: 'org-id',
          name: 'Stadt Musterhausen',
          createdAt: '2026-10-01',
          archived: false,
        }}
      />,
    );
    fireEvent.click(screen.getByTestId('org-delete-open'));
    const confirm = await screen.findByTestId('org-delete-confirm');
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId('org-delete-name'), {
      target: { value: 'stadt musterhausen' },
    });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId('org-delete-name'), {
      target: { value: 'Stadt Musterhausen' },
    });
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(mocks.deleteOrg).toHaveBeenCalledWith(
        { id: 'org-id', data: { confirmationName: 'Stadt Musterhausen' } },
        expect.any(Object),
      ),
    );
  });
});
