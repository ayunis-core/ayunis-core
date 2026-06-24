import { Input } from '@/shared/ui/shadcn/input';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';

interface TeamsFiltersProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TeamsFilters({
  value,
  onChange,
}: Readonly<TeamsFiltersProps>) {
  const { t } = useTranslation('admin-settings-teams');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  return (
    <div className="flex gap-4 mb-6">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder={t('teams.filters.searchPlaceholder')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  );
}
