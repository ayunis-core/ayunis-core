import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { UsersSearchWidget } from '@/widgets/users-search/ui/UsersSearchWidget';

interface UsersSearchProps {
  search?: string;
}

export function UsersSearch({ search }: Readonly<UsersSearchProps>) {
  const navigate = useNavigate();
  const handleSearchChange = useCallback(
    (newSearch?: string) => {
      void navigate({
        to: '/super-admin-settings/users',
        search: (previous: { search?: string; page?: number }) => ({
          ...previous,
          search: newSearch,
          page: undefined,
        }),
      });
    },
    [navigate],
  );

  return (
    <UsersSearchWidget
      search={search}
      onSearchChange={handleSearchChange}
      translationNamespace="super-admin-settings-users"
      placeholderKey="search.placeholder"
      inputTestId="super-admin-users-search"
    />
  );
}
