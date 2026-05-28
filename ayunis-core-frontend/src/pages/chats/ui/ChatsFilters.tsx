import { Input } from '@/shared/ui/shadcn/input';
import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';

interface ChatsFiltersProps {
  search?: string;
}

export default function ChatsFilters({ search }: Readonly<ChatsFiltersProps>) {
  const { t } = useTranslation('chats');
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState(search ?? '');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

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
    <div className="flex gap-4 mb-6">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder={t('filters.searchPlaceholder')}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  );
}
