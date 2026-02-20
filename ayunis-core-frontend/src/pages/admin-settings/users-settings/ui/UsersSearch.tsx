import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { UsersSearchWidget } from '@/widgets/users-search/ui/UsersSearchWidget';

interface UsersSearchProps {
  search?: string;
}

export default function UsersSearch({ search }: Readonly<UsersSearchProps>) {
  const navigate = useNavigate();

  const handleSearchChange = useCallback(
    (newSearch?: string) => {
      void navigate({
        to: '/admin-settings/users',
        search: (prev: { search?: string; page?: number }) => ({
          ...prev,
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
      translationNamespace="admin-settings-users"
      placeholderKey="search.placeholder"
    />
  );
}
