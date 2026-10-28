import { ListToolbarSearch } from '@/widgets/list-toolbar';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

interface ChatsFiltersProps {
  search?: string;
}

export default function ChatsFilters({ search }: Readonly<ChatsFiltersProps>) {
  const { t } = useTranslation('chats');
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState(search ?? '');

  useEffect(() => {
    const updateValue = () => {
      setSearchValue(search ?? '');
    };
    updateValue();
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (search ?? '')) {
        void navigate({
          to: '/chats',
          search: (prev: { search?: string; page?: number }) => ({
            ...prev,
            search: searchValue || undefined,
            page: undefined,
          }),
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, search, navigate]);

  return (
    <ListToolbarSearch
      placeholder={t('filters.searchPlaceholder')}
      value={searchValue}
      onChange={(event) => setSearchValue(event.target.value)}
      data-testid="chats-search"
    />
  );
}
