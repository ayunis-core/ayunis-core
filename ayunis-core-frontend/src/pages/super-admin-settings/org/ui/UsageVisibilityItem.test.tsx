import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UsageVisibilityItem from './UsageVisibilityItem';

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock(
  '@/pages/super-admin-settings/org/api/useSetOrgUsageVisibility',
  () => ({
    useSetOrgUsageVisibility: () => ({ mutate, isPending: false }),
  }),
);
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
afterEach(cleanup);
const org = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Stadt Leverkusen',
  archived: false,
  hideIndividualUsage: false,
  createdAt: '2026-10-12',
};
it('enables hidden individual usage for the selected organisation', () => {
  render(<UsageVisibilityItem org={org} />);
  fireEvent.click(screen.getByTestId('org-hide-individual-usage'));
  expect(mutate).toHaveBeenCalledWith({
    id: org.id,
    data: { hideIndividualUsage: true },
  });
});
describe('stored setting', () => {
  it('renders the enabled setting as checked', () => {
    render(<UsageVisibilityItem org={{ ...org, hideIndividualUsage: true }} />);
    expect(
      screen
        .getByTestId('org-hide-individual-usage')
        .getAttribute('aria-checked'),
    ).toBe('true');
  });
});
