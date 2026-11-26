import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ListFilter } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';

interface InboxReadFilterProps {
  showRead: boolean;
}

export function InboxReadFilter({ showRead }: Readonly<InboxReadFilterProps>) {
  const { t } = useTranslation('inbox');
  const navigate = useNavigate({ from: '/inbox' });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t('filter.read.label')}
          title={t('filter.read.label')}
          data-testid="inbox-read-filter"
          className={cn(
            'ml-1 text-muted-foreground',
            !showRead && 'text-brand',
          )}
        >
          <ListFilter />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuCheckboxItem
          checked={showRead}
          onCheckedChange={(checked) =>
            void navigate({
              search: (prev) => ({
                ...prev,
                showRead: checked || undefined,
                page: undefined,
              }),
            })
          }
          data-testid="inbox-read-filter-show-read"
        >
          {t('filter.read.show')}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
