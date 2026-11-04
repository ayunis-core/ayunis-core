import { useTranslation } from 'react-i18next';
import { SearchField } from '@/shared/ui/search-field';
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
      <SearchField
        ref={searchInputRef}
        leadingIcon
        wrapperClassName="flex-1 max-w-md"
        placeholder={t('teams.filters.searchPlaceholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
