import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SuperAdminInvitesPagination from './SuperAdminInvitesPagination';
import SuperAdminUsersPagination from './SuperAdminUsersPagination';

type SearchParams = Record<string, string | number | boolean | undefined>;

vi.mock('@/widgets/pagination', () => ({
  PaginationWidget: ({
    buildSearchParams,
  }: {
    buildSearchParams: (
      page: number,
    ) => SearchParams | ((previous: SearchParams) => SearchParams);
  }) => {
    const nextSearch = buildSearchParams(3);
    const search =
      typeof nextSearch === 'function'
        ? nextSearch({
            invitesPage: 2,
            invitesSearch: 'pending',
            usersPage: 4,
            usersSearch: 'active',
          })
        : nextSearch;

    return (
      <output data-testid="search-params">{JSON.stringify(search)}</output>
    );
  },
}));

describe('Super Admin organization pagination', () => {
  it('preserves invitation pagination when changing the users page', () => {
    render(
      <SuperAdminUsersPagination
        currentPage={1}
        totalPages={5}
        search="active"
        orgId="org-id"
      />,
    );

    expect(
      JSON.parse(screen.getByTestId('search-params').textContent ?? ''),
    ).toEqual({
      invitesPage: 2,
      invitesSearch: 'pending',
      usersPage: 3,
      usersSearch: 'active',
      tab: 'users',
    });
  });

  it('preserves user pagination when changing the invitations page', () => {
    render(
      <SuperAdminInvitesPagination
        currentPage={1}
        totalPages={5}
        search="pending"
        orgId="org-id"
      />,
    );

    expect(
      JSON.parse(screen.getByTestId('search-params').textContent ?? ''),
    ).toEqual({
      invitesPage: 3,
      invitesSearch: 'pending',
      usersPage: 4,
      usersSearch: 'active',
      tab: 'users',
    });
  });
});
