import { Input } from '@/shared/ui/shadcn/input';
import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        ref={searchInputRef}
        type="text"
        placeholder={t('search.placeholder')}
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
