import { useTranslation } from 'react-i18next';
import { Check, SlidersHorizontal } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import {
  WORKSPACE_SORT_KEYS,
  type WorkspaceSortKey,
} from '../lib/sortWorkspaces';
import type { WorkspacesViewMode } from './useWorkspacesViewMode';

interface WorkspacesViewOptionsProps {
  sortKey: WorkspaceSortKey;
  onSortKeyChange: (sortKey: WorkspaceSortKey) => void;
  viewMode: WorkspacesViewMode;
  onViewModeChange: (viewMode: WorkspacesViewMode) => void;
}

const VIEW_MODES: readonly WorkspacesViewMode[] = ['grid', 'list'];

export function WorkspacesViewOptions({
  sortKey,
  onSortKeyChange,
  viewMode,
  onViewModeChange,
}: Readonly<WorkspacesViewOptionsProps>) {
  const { t } = useTranslation('workspaces');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('page.viewOptions')}>
          <SlidersHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('page.sortBy')}</DropdownMenuLabel>
        {WORKSPACE_SORT_KEYS.map((key) => (
          <DropdownMenuItem key={key} onClick={() => onSortKeyChange(key)}>
            <span>{t(`sort.${key}`)}</span>
            {sortKey === key && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('page.display')}</DropdownMenuLabel>
        {VIEW_MODES.map((mode) => (
          <DropdownMenuItem key={mode} onClick={() => onViewModeChange(mode)}>
            <span>{t(`page.${mode}`)}</span>
            {viewMode === mode && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
