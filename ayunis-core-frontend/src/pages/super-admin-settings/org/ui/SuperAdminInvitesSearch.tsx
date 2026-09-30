import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { UsersSearchWidget } from '@/widgets/users-search/ui/UsersSearchWidget';

interface SuperAdminInvitesSearchProps {
  search?: string;
  orgId: string;
}

interface SearchParams {
  invitesSearch?: string;
  invitesPage?: number;
}

export default function SuperAdminInvitesSearch({
  search,
  orgId,
}: Readonly<SuperAdminInvitesSearchProps>) {
  const navigate = useNavigate();
  const handleSearchChange = useCallback(
    (newSearch?: string) => {
      void navigate({
        to: '/super-admin-settings/orgs/$id',
        params: { id: orgId },
        search: (previous: SearchParams) => ({
          ...previous,
          tab: 'users' as const,
          invitesSearch: newSearch,
          invitesPage: undefined,
        }),
      });
    },
    [navigate, orgId],
  );

  return (
    <UsersSearchWidget
      search={search}
      onSearchChange={handleSearchChange}
      translationNamespace="admin-settings-users"
      placeholderKey="invitesSearch.placeholder"
    />
  );
}
