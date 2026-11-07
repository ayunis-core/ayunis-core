import { ListFilter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@ayunis/ui/lib/cn';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';

interface RoutineThreadsFilterProps {
  showRoutineThreads: boolean;
  onShowRoutineThreadsChange: (show: boolean) => void;
}

export function RoutineThreadsFilter({
  showRoutineThreads,
  onShowRoutineThreadsChange,
}: Readonly<RoutineThreadsFilterProps>) {
  const { t } = useTranslation('common');

  return (
    <DropdownMenu>
      {/* A span, not a button: the group label it sits in is a button. */}
      <DropdownMenuTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label={t('sidebar.chatFilter')}
          data-testid="sidebar-chats-filter"
          className={cn(
            'text-muted-foreground',
            !showRoutineThreads && 'text-brand',
          )}
        >
          <ListFilter className="size-4" />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuCheckboxItem
          checked={showRoutineThreads}
          onCheckedChange={onShowRoutineThreadsChange}
          data-testid="sidebar-chats-filter-show-routines"
        >
          {t('sidebar.showRoutineChats')}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
