import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { SearchField } from '@/shared/ui/search-field';
import { useState, useEffect, useRef } from 'react';

interface OrgsSearchProps {
  search?: string;
}

export default function OrgsSearch({ search }: Readonly<OrgsSearchProps>) {
  const { t } = useTranslation('super-admin-settings-orgs');
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState(search ?? '');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Sync search value with URL params
  useEffect(() => {
    const updateValue = () => {
      setSearchValue(search ?? '');
    };
    updateValue();
  }, [search]);

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (search ?? '')) {
        void navigate({
          to: '/super-admin-settings/orgs',
          search: (prev: { search?: string; page?: number }) => ({
            ...prev,
            search: searchValue || undefined,
            page: undefined, // Reset to page 1 when search changes
          }),
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, search, navigate]);

  return (
    <SearchField
      ref={searchInputRef}
      leadingIcon
      wrapperClassName="min-w-48 flex-1 max-w-md"
      placeholder={t('search.placeholder')}
      value={searchValue}
      onChange={(e) => setSearchValue(e.target.value)}
      className="pl-10"
    />
  );
}
