import { useTranslation } from 'react-i18next';
import { Check, SlidersHorizontal } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import {
  WORKSPACE_SORT_KEYS,
  type WorkspaceSortKey,
} from '../lib/sortWorkspaces';

interface WorkspacesViewOptionsProps {
  sortKey: WorkspaceSortKey;
  onSortKeyChange: (sortKey: WorkspaceSortKey) => void;
}

export function WorkspacesViewOptions({
  sortKey,
  onSortKeyChange,
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
