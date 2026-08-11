import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Input } from '@ayunis/ui/components/input';
import type { WorkspaceSortKey } from '../lib/sortWorkspaces';
import type { WorkspacesViewMode } from './useWorkspacesViewMode';
import { WorkspacesViewOptions } from './WorkspacesViewOptions';

interface WorkspacesToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  sortKey: WorkspaceSortKey;
  onSortKeyChange: (sortKey: WorkspaceSortKey) => void;
  viewMode: WorkspacesViewMode;
  onViewModeChange: (viewMode: WorkspacesViewMode) => void;
  createButton: ReactNode;
}

export function WorkspacesToolbar({
  search,
  onSearchChange,
  sortKey,
  onSortKeyChange,
  viewMode,
  onViewModeChange,
  createButton,
}: Readonly<WorkspacesToolbarProps>) {
  const { t } = useTranslation('workspaces');

  return (
    <div className="flex items-center gap-2">
      <div className="relative hidden sm:block">
        <Search className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('page.searchPlaceholder')}
          className="w-56 pl-8"
        />
      </div>
      <WorkspacesViewOptions
        sortKey={sortKey}
        onSortKeyChange={onSortKeyChange}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
      {createButton}
    </div>
  );
}
