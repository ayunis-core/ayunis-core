import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Input } from '@ayunis/ui/components/input';
import type { WorkspaceSortKey } from '@/pages/workspaces/lib/sortWorkspaces';
import { WorkspacesViewOptions } from './WorkspacesViewOptions';

interface WorkspacesToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  sortKey: WorkspaceSortKey;
  onSortKeyChange: (sortKey: WorkspaceSortKey) => void;
  createButton: ReactNode;
}

export function WorkspacesToolbar({
  search,
  onSearchChange,
  sortKey,
  onSortKeyChange,
  createButton,
}: Readonly<WorkspacesToolbarProps>) {
  const { t } = useTranslation('workspaces');
  const [searchValue, setSearchValue] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== search) onSearchChange(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [onSearchChange, search, searchValue]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative hidden sm:block">
        <Search className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder={t('page.searchPlaceholder')}
          className="w-56 pl-8"
        />
      </div>
      <WorkspacesViewOptions
        sortKey={sortKey}
        onSortKeyChange={onSortKeyChange}
      />
      {createButton}
    </div>
  );
}
