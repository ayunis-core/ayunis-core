import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { UsersSearchWidget } from '@/widgets/users-search/ui/UsersSearchWidget';

interface SuperAdminUsersSearchProps {
  search?: string;
  orgId: string;
}

interface SearchParams {
  tab?: string;
  usersSearch?: string;
  usersPage?: number;
}

export default function SuperAdminUsersSearch({
  search,
  orgId,
}: Readonly<SuperAdminUsersSearchProps>) {
  const navigate = useNavigate();

  const handleSearchChange = useCallback(
    (newSearch?: string) => {
      void navigate({
        to: '/super-admin-settings/orgs/$id',
        params: { id: orgId },
        search: (prev: SearchParams) => ({
          ...prev,
          tab: 'users' as const,
          usersSearch: newSearch,
          usersPage: undefined,
        }),
      });
    },
    [navigate, orgId],
  );

  return (
    <UsersSearchWidget
      search={search}
      onSearchChange={handleSearchChange}
      translationNamespace="super-admin-settings-org"
      placeholderKey="search.placeholder"
    />
  );
}
